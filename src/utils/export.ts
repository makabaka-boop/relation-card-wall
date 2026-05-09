import type { Card, Relation } from '../types'
import { RELATION_CONFIG } from '../types'
import { computeBundlePaths, pointsToSvgPath } from '../utils/bundler'

export function exportToPNG(cards: Card[], relations: Relation[], bundleMode: boolean): void {
  if (cards.length === 0) {
    alert('没有可导出的内容')
    return
  }

  const padding = 100
  const minX = Math.min(...cards.map((c) => c.x)) - padding
  const minY = Math.min(...cards.map((c) => c.y)) - padding
  const maxX = Math.max(...cards.map((c) => c.x + c.width)) + padding
  const maxY = Math.max(...cards.map((c) => c.y + c.height)) + padding
  const width = maxX - minX
  const height = maxY - minY

  const bundlePaths = computeBundlePaths(cards, relations, bundleMode)

  const tagColor = (card: Card): string => {
    if (card.tagColor) return card.tagColor
    if (!card.tag) return '#94a3b8'
    let hash = 0
    for (let i = 0; i < card.tag.length; i++) {
      hash = (hash * 31 + card.tag.charCodeAt(i)) >>> 0
    }
    const hue = hash % 360
    return `hsl(${hue}, 70%, 55%)`
  }

  const defs = Object.entries(RELATION_CONFIG)
    .map(
      ([type, config]) => `
    <marker id="arrow-${type}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${config.color}" />
    </marker>
  `,
    )
    .join('\n')

  const relationsSvg = bundlePaths
    .map((bp) => {
      const rel = relations.find((r) => r.id === bp.relationId)
      if (!rel) return ''
      const config = RELATION_CONFIG[rel.type]
      const dash = config.strokeDasharray ? `stroke-dasharray="${config.strokeDasharray}"` : ''
      const offsetPoints = bp.points.map((p) => ({ x: p.x - minX, y: p.y - minY }))
      return `<path d="${pointsToSvgPath(offsetPoints)}" stroke="${config.color}" ${dash} stroke-width="2" fill="none" marker-end="url(#arrow-${rel.type})" />`
    })
    .join('\n')

  const cardsSvg = cards
    .map((c) => {
      const priorityStars = '★'.repeat(c.priority) + '☆'.repeat(5 - c.priority)
      const tColor = tagColor(c)
      return `
        <g transform="translate(${c.x - minX}, ${c.y - minY})">
          <rect width="${c.width}" height="${c.height}" rx="10" ry="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5" />
          <rect x="0" y="0" width="${c.width}" height="4" rx="10" fill="${tColor}" />
          <text x="14" y="28" font-size="15" font-weight="600" fill="#1f2937" font-family="-apple-system, sans-serif">${escapeXml(c.title)}</text>
          ${wrapText(c.summary || '', 14, 38, c.width - 28, 18, 4)}
          ${c.tag ? `<text x="14" y="${c.height - 14}" font-size="11" fill="${tColor}" font-weight="500" font-family="-apple-system, sans-serif">#${escapeXml(c.tag)}</text>` : ''}
          <text x="${c.width - 14}" y="${c.height - 14}" font-size="12" text-anchor="end" fill="#94a3b8" font-family="-apple-system, sans-serif">${priorityStars}</text>
        </g>
      `
    })
    .join('\n')

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
        ${defs}
      </defs>
      <rect width="${width}" height="${height}" fill="#f8fafc" />
      <rect width="${width}" height="${height}" fill="url(#grid)" />
      <g>
        ${relationsSvg}
      </g>
      <g>
        ${cardsSvg}
      </g>
    </svg>
  `

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)
    ctx.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(url)

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return
      const pngUrl = URL.createObjectURL(pngBlob)
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `relation-card-wall-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(pngUrl)
    }, 'image/png')
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    alert('PNG 导出失败，正在下载 SVG 版本...')
    const a = document.createElement('a')
    a.href = url
    a.download = `relation-card-wall-${Date.now()}.svg`
    a.click()
  }
  img.src = url
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): string {
  if (!text) return ''
  const chars = Array.from(text)
  let lines: string[] = []
  let currentLine = ''

  for (const char of chars) {
    const testLine = currentLine + char
    if (approxTextWidth(testLine, 12) > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = char
    } else {
      currentLine = testLine
    }
    if (lines.length >= maxLines) break
  }
  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }
  if (lines.length === maxLines && chars.join('').length > lines.join('').length) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '...'
  }

  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-size="12" fill="#64748b" font-family="-apple-system, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('\n')
}

function approxTextWidth(text: string, fontSize: number): number {
  let width = 0
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code > 128) {
      width += fontSize * 0.9
    } else {
      width += fontSize * 0.55
    }
  }
  return width
}

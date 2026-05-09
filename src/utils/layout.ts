import type { Card } from '../types'

export function alignCards(cards: Card[], mode: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v'): Record<string, Partial<Card>> {
  if (cards.length < 2) return {}

  const updates: Record<string, Partial<Card>> = {}

  switch (mode) {
    case 'left': {
      const minX = Math.min(...cards.map((c) => c.x))
      cards.forEach((c) => (updates[c.id] = { x: minX }))
      break
    }
    case 'right': {
      const maxX = Math.max(...cards.map((c) => c.x + c.width))
      cards.forEach((c) => (updates[c.id] = { x: maxX - c.width }))
      break
    }
    case 'top': {
      const minY = Math.min(...cards.map((c) => c.y))
      cards.forEach((c) => (updates[c.id] = { y: minY }))
      break
    }
    case 'bottom': {
      const maxY = Math.max(...cards.map((c) => c.y + c.height))
      cards.forEach((c) => (updates[c.id] = { y: maxY - c.height }))
      break
    }
    case 'center-h': {
      const avgX = cards.reduce((s, c) => s + c.x + c.width / 2, 0) / cards.length
      cards.forEach((c) => (updates[c.id] = { x: avgX - c.width / 2 }))
      break
    }
    case 'center-v': {
      const avgY = cards.reduce((s, c) => s + c.y + c.height / 2, 0) / cards.length
      cards.forEach((c) => (updates[c.id] = { y: avgY - c.height / 2 }))
      break
    }
  }

  return updates
}

export function distillTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 55%)`
}

export function cardMatchesKeyword(card: Card, keyword: string): boolean {
  if (!keyword) return false
  const k = keyword.toLowerCase()
  return (
    card.title.toLowerCase().includes(k) ||
    card.summary.toLowerCase().includes(k) ||
    card.tag.toLowerCase().includes(k)
  )
}

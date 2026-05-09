import type { Card, Relation, BundlePath } from '../types'

export function getCardCenter(card: Card): { x: number; y: number } {
  return {
    x: card.x + card.width / 2,
    y: card.y + card.height / 2,
  }
}

export function getCardEdgePoint(
  card: Card,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const center = getCardCenter(card)
  const dx = targetX - center.x
  const dy = targetY - center.y

  if (dx === 0 && dy === 0) return center

  const halfW = card.width / 2
  const halfH = card.height / 2

  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  let x, y

  if (absDx / halfW > absDy / halfH) {
    x = dx > 0 ? center.x + halfW : center.x - halfW
    y = center.y + (dy / absDx) * halfW
  } else {
    y = dy > 0 ? center.y + halfH : center.y - halfH
    x = center.x + (dx / absDy) * halfH
  }

  return { x, y }
}

export function computeBundlePaths(
  cards: Card[],
  relations: Relation[],
  enabled: boolean,
): BundlePath[] {
  const cardMap = new Map(cards.map((c) => [c.id, c]))

  if (!enabled) {
    return relations.map((r) => {
      const source = cardMap.get(r.sourceId)
      const target = cardMap.get(r.targetId)
      if (!source || !target) return { relationId: r.id, points: [] }

      const targetCenter = getCardCenter(target)
      const sourceCenter = getCardCenter(source)

      const start = getCardEdgePoint(source, targetCenter.x, targetCenter.y)
      const end = getCardEdgePoint(target, sourceCenter.x, sourceCenter.y)

      return {
        relationId: r.id,
        points: [start, end],
      }
    })
  }

  type GroupKey = string
  const groups = new Map<GroupKey, { relations: Relation[]; points: { x: number; y: number }[] }>()

  const GRID_SIZE = 150

  for (const r of relations) {
    const source = cardMap.get(r.sourceId)
    const target = cardMap.get(r.targetId)
    if (!source || !target) continue

    const sourceCenter = getCardCenter(source)
    const targetCenter = getCardCenter(target)

    const sxGrid = Math.floor(sourceCenter.x / GRID_SIZE)
    const syGrid = Math.floor(sourceCenter.y / GRID_SIZE)
    const txGrid = Math.floor(targetCenter.x / GRID_SIZE)
    const tyGrid = Math.floor(targetCenter.y / GRID_SIZE)

    const gridDx = txGrid - sxGrid
    const gridDy = tyGrid - syGrid

    let direction: string
    if (Math.abs(gridDx) >= Math.abs(gridDy)) {
      direction = gridDx >= 0 ? 'right' : 'left'
    } else {
      direction = gridDy >= 0 ? 'down' : 'up'
    }

    const groupKey = `${sxGrid},${syGrid},${direction},${r.type}`

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { relations: [], points: [] })
    }
    groups.get(groupKey)!.relations.push(r)
  }

  const result = new Map<string, BundlePath>()

  for (const [, group] of groups) {
    const firstRel = group.relations[0]
    const firstSource = cardMap.get(firstRel.sourceId)!
    const sourceCenter = getCardCenter(firstSource)

    const targetCenters = group.relations
      .map((r) => cardMap.get(r.targetId))
      .filter(Boolean)
      .map((c) => getCardCenter(c!))

    if (targetCenters.length === 0) continue

    const avgX = targetCenters.reduce((s, p) => s + p.x, 0) / targetCenters.length
    const avgY = targetCenters.reduce((s, p) => s + p.y, 0) / targetCenters.length

    const midX = (sourceCenter.x + avgX) / 2
    const midY = (sourceCenter.y + avgY) / 2

    const trunkStart = {
      x: sourceCenter.x + (midX - sourceCenter.x) * 0.3,
      y: sourceCenter.y + (midY - sourceCenter.y) * 0.3,
    }
    const trunkEnd = {
      x: sourceCenter.x + (midX - sourceCenter.x) * 0.7,
      y: sourceCenter.y + (midY - sourceCenter.y) * 0.7,
    }

    for (const r of group.relations) {
      const source = cardMap.get(r.sourceId)!
      const target = cardMap.get(r.targetId)!
      const tCenter = getCardCenter(target)
      const sCenter = getCardCenter(source)

      const start = getCardEdgePoint(source, tCenter.x, tCenter.y)
      const end = getCardEdgePoint(target, sCenter.x, sCenter.y)

      let points: { x: number; y: number }[]

      if (group.relations.length >= 2) {
        points = [start, trunkStart, trunkEnd, end]
      } else {
        points = [start, end]
      }

      result.set(r.id, { relationId: r.id, points })
    }
  }

  for (const r of relations) {
    if (!result.has(r.id)) {
      const source = cardMap.get(r.sourceId)
      const target = cardMap.get(r.targetId)
      if (source && target) {
        const tCenter = getCardCenter(target)
        const sCenter = getCardCenter(source)
        result.set(r.id, {
          relationId: r.id,
          points: [
            getCardEdgePoint(source, tCenter.x, tCenter.y),
            getCardEdgePoint(target, sCenter.x, sCenter.y),
          ],
        })
      }
    }
  }

  return Array.from(result.values())
}

export function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const c1x = p0.x + (p1.x - p0.x) * 0.5
    const c1y = p0.y + (p1.y - p0.y) * 0.5
    const c2x = p1.x + (p2.x - p1.x) * 0.5
    const c2y = p1.y + (p2.y - p1.y) * 0.5
    d += ` L ${c1x} ${c1y} Q ${p1.x} ${p1.y} ${c2x} ${c2y}`
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`
  return d
}

export function getArrowMarkerId(type: string): string {
  return `arrow-${type}`
}

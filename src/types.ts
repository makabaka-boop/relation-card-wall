export type RelationType = 'reference' | 'dependency' | 'conflict'

export interface Card {
  id: string
  title: string
  summary: string
  tag: string
  tagColor: string
  priority: 1 | 2 | 3 | 4 | 5
  x: number
  y: number
  width: number
  height: number
}

export interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
}

export interface AppState {
  cards: Card[]
  relations: Relation[]
  selectedCardIds: string[]
  selectedRelationIds: string[]
  viewTransform: { scale: number; x: number; y: number }
  bundleMode: boolean
  filterTags: string[]
  highlightKeyword: string
}

export interface BundlePath {
  relationId: string
  points: { x: number; y: number }[]
}

export const RELATION_CONFIG: Record<RelationType, { color: string; label: string; strokeDasharray?: string }> = {
  reference: { color: '#3b82f6', label: '引用' },
  dependency: { color: '#10b981', label: '依赖', strokeDasharray: '8 4' },
  conflict: { color: '#ef4444', label: '冲突', strokeDasharray: '4 4' },
}

export const TAG_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
]

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

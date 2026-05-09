export type RelationType = 'reference' | 'dependency' | 'conflict'

export interface CardData {
  id: string
  title: string
  summary: string
  tags: string[]
  tagColor: string
  priority: 'low' | 'medium' | 'high'
  x: number
  y: number
  width: number
  height: number
}

export interface RelationData {
  id: string
  fromCardId: string
  toCardId: string
  type: RelationType
}

export interface CanvasState {
  offsetX: number
  offsetY: number
  scale: number
}

export const RELATION_CONFIG: Record<RelationType, { color: string; label: string; dashArray: string; markerEnd: string }> = {
  reference: { color: '#4A90D9', label: '引用', dashArray: 'none', markerEnd: 'arrow-reference' },
  dependency: { color: '#F5A623', label: '依赖', dashArray: '8,4', markerEnd: 'arrow-dependency' },
  conflict: { color: '#D0021B', label: '冲突', dashArray: '4,4', markerEnd: 'arrow-conflict' },
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#8BC34A',
  medium: '#FF9800',
  high: '#F44336',
}

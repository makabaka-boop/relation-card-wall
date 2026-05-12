export interface Card {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  color: string;
  priority: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RelationType = 'reference' | 'dependency' | 'conflict';

export interface Relation {
  id: string;
  from: string;
  to: string;
  type: RelationType;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const RELATION_CONFIG: Record<RelationType, { color: string; label: string; arrowStyle: string }> = {
  reference: { color: '#3B82F6', label: '引用', arrowStyle: 'arrow' },
  dependency: { color: '#10B981', label: '依赖', arrowStyle: 'diamond' },
  conflict: { color: '#EF4444', label: '冲突', arrowStyle: 'circle' }
};

export const DEFAULT_COLORS = [
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6'
];

import type { Card, Relation } from '../types';

interface Point {
  x: number;
  y: number;
}

interface LineSegment {
  start: Point;
  end: Point;
}

const BUNDLE_THRESHOLD = 50;
const BUNDLE_MERGE_DISTANCE = 80;

export function calculateBundledPaths(
  relations: Relation[],
  cards: Card[],
  enabled: boolean
): Map<string, Point[]> {
  const result = new Map<string, Point[]>();
  
  if (!enabled) {
    for (const rel of relations) {
      const fromCard = cards.find(c => c.id === rel.from);
      const toCard = cards.find(c => c.id === rel.to);
      if (fromCard && toCard) {
        const start = { x: fromCard.x + fromCard.width / 2, y: fromCard.y + fromCard.height / 2 };
        const end = { x: toCard.x + toCard.width / 2, y: toCard.y + toCard.height / 2 };
        result.set(rel.id, [start, end]);
      }
    }
    return result;
  }

  const groups = groupRelations(relations, cards);
  
  for (const group of groups) {
    if (group.relations.length <= 1) {
      for (const rel of group.relations) {
        const path = calculateDirectPath(rel, cards);
        result.set(rel.id, path);
      }
    } else {
      const bundledPaths = calculateBundledPath(group, cards);
      for (const [relId, path] of bundledPaths) {
        result.set(relId, path);
      }
    }
  }
  
  return result;
}

function groupRelations(relations: Relation[], cards: Card[]): Array<{ relations: Relation[]; center: Point }> {
  const groups: Array<{ relations: Relation[]; center: Point }> = [];
  
  for (const rel of relations) {
    const fromCard = cards.find(c => c.id === rel.from);
    if (!fromCard) continue;
    
    const startPoint = { x: fromCard.x + fromCard.width / 2, y: fromCard.y + fromCard.height / 2 };
    
    let assigned = false;
    for (const group of groups) {
      const dist = Math.hypot(startPoint.x - group.center.x, startPoint.y - group.center.y);
      if (dist < BUNDLE_MERGE_DISTANCE) {
        group.relations.push(rel);
        assigned = true;
        break;
      }
    }
    
    if (!assigned) {
      groups.push({ relations: [rel], center: startPoint });
    }
  }
  
  return groups;
}

function calculateDirectPath(rel: Relation, cards: Card[]): Point[] {
  const fromCard = cards.find(c => c.id === rel.from);
  const toCard = cards.find(c => c.id === rel.to);
  if (!fromCard || !toCard) return [];
  
  const start = { x: fromCard.x + fromCard.width / 2, y: fromCard.y + fromCard.height / 2 };
  const end = { x: toCard.x + toCard.width / 2, y: toCard.y + toCard.height / 2 };
  
  return [start, end];
}

function calculateBundledPath(
  group: { relations: Relation[]; center: Point },
  cards: Card[]
): Map<string, Point[]> {
  const result = new Map<string, Point[]>();
  
  const bundlePoint = {
    x: group.center.x + BUNDLE_THRESHOLD,
    y: group.center.y
  };
  
  for (const rel of group.relations) {
    const fromCard = cards.find(c => c.id === rel.from);
    const toCard = cards.find(c => c.id === rel.to);
    if (!fromCard || !toCard) continue;
    
    const start = { x: fromCard.x + fromCard.width / 2, y: fromCard.y + fromCard.height / 2 };
    const end = { x: toCard.x + toCard.width / 2, y: toCard.y + toCard.height / 2 };
    
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    const controlPoint1 = { x: midX, y: start.y };
    const controlPoint2 = { x: midX, y: end.y };
    
    result.set(rel.id, [start, controlPoint1, controlPoint2, end]);
  }
  
  return result;
}

export function pathToSvgD(points: Point[]): string {
  if (points.length < 2) return '';
  
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  
  return d;
}

export function curvedPathToSvgD(points: Point[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
  }
  
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  
  return d;
}

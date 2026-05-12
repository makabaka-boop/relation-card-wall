import type { Card, Relation } from '../types';
import { RELATION_CONFIG } from '../types';

export function exportToPNG(
  canvasElement: SVGSVGElement,
  cards: Card[],
  relations: Relation[]
): Promise<string> {
  return new Promise((resolve) => {
    const svgElement = canvasElement.cloneNode(true) as SVGSVGElement;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach(card => {
      minX = Math.min(minX, card.x);
      minY = Math.min(minY, card.y);
      maxX = Math.max(maxX, card.x + card.width);
      maxY = Math.max(maxY, card.y + card.height);
    });
    
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    svgElement.setAttribute('width', width.toString());
    svgElement.setAttribute('height', height.toString());
    svgElement.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width} ${height}`);
    
    const style = document.createElement('style');
    style.textContent = `
      .card { fill: white; stroke: #e5e7eb; stroke-width: 2; rx: 8; }
      .card-title { font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600; }
      .card-summary { font-family: system-ui, sans-serif; font-size: 12px; fill: #6b7280; }
      .card-tag { font-family: system-ui, sans-serif; font-size: 10px; }
    `;
    svgElement.insertBefore(style, svgElement.firstChild);
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

export function downloadFile(data: string, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getRelationColor(type: string): string {
  return RELATION_CONFIG[type as keyof typeof RELATION_CONFIG]?.color || '#6B7280';
}

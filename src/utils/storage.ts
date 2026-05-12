import type { Card, Relation, CanvasState } from '../types';

const STORAGE_KEY = 'relation-card-wall-data';

interface StoredData {
  cards: Card[];
  relations: Relation[];
  canvas: CanvasState;
}

const defaultData: StoredData = {
  cards: [],
  relations: [],
  canvas: {
    zoom: 1,
    panX: 0,
    panY: 0
  }
};

export function loadData(): StoredData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return { ...defaultData };
}

export function saveData(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

import { reactive, ref, watch } from 'vue'
import type { Card, Relation, AppState } from './types'
import { generateId } from './types'

const STORAGE_KEY = 'relation-card-wall-data'

function loadFromStorage(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.cards && Array.isArray(data.cards)) {
        data.cards = data.cards.map((c: Card) => ({
          ...c,
          tagColor: c.tagColor || '',
        }))
      }
      return data
    }
  } catch (e) {
    console.error('Failed to load from storage', e)
  }
  return {}
}

function saveToStorage(state: Partial<AppState>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cards: state.cards,
        relations: state.relations,
        viewTransform: state.viewTransform,
        bundleMode: state.bundleMode,
      }),
    )
  } catch (e) {
    console.error('Failed to save to storage', e)
  }
}

const stored = loadFromStorage()

export const state = reactive<AppState>({
  cards: stored.cards || [],
  relations: stored.relations || [],
  selectedCardIds: [],
  selectedRelationIds: [],
  viewTransform: stored.viewTransform || { scale: 1, x: 0, y: 0 },
  bundleMode: stored.bundleMode ?? true,
  filterTags: [],
  highlightKeyword: '',
})

export const allTags = ref<string[]>([])

function updateTags() {
  const tagSet = new Set<string>()
  state.cards.forEach((c) => c.tag && tagSet.add(c.tag))
  allTags.value = Array.from(tagSet)
}

updateTags()

watch(
  () => [state.cards, state.relations, state.viewTransform, state.bundleMode],
  () => {
    updateTags()
    saveToStorage(state)
  },
  { deep: true },
)

export function addCard(data: Partial<Card> & { x: number; y: number }): Card {
  const card: Card = {
    id: generateId(),
    title: data.title || '新卡片',
    summary: data.summary || '',
    tag: data.tag || '',
    tagColor: data.tagColor || '',
    priority: data.priority || 3,
    x: data.x,
    y: data.y,
    width: data.width || 220,
    height: data.height || 140,
  }
  state.cards.push(card)
  return card
}

export function updateCard(id: string, updates: Partial<Card>) {
  const idx = state.cards.findIndex((c) => c.id === id)
  if (idx !== -1) {
    state.cards[idx] = { ...state.cards[idx], ...updates }
  }
}

export function deleteCard(id: string) {
  state.cards = state.cards.filter((c) => c.id !== id)
  state.relations = state.relations.filter((r) => r.sourceId !== id && r.targetId !== id)
  state.selectedCardIds = state.selectedCardIds.filter((c) => c !== id)
}

export function addRelation(data: Omit<Relation, 'id'>): Relation {
  if (data.sourceId === data.targetId) {
    throw new Error('Cannot create self-relation')
  }
  const exists = state.relations.some(
    (r) => r.sourceId === data.sourceId && r.targetId === data.targetId && r.type === data.type,
  )
  if (exists) {
    throw new Error('Relation already exists')
  }
  const relation: Relation = { id: generateId(), ...data }
  state.relations.push(relation)
  return relation
}

export function deleteRelation(id: string) {
  state.relations = state.relations.filter((r) => r.id !== id)
  state.selectedRelationIds = state.selectedRelationIds.filter((r) => r !== id)
}

export function toggleCardSelection(id: string, additive: boolean = false) {
  if (additive) {
    const idx = state.selectedCardIds.indexOf(id)
    if (idx === -1) {
      state.selectedCardIds.push(id)
    } else {
      state.selectedCardIds.splice(idx, 1)
    }
  } else {
    state.selectedCardIds = [id]
  }
  state.selectedRelationIds = []
}

export function clearSelection() {
  state.selectedCardIds = []
  state.selectedRelationIds = []
}

export function setViewTransform(t: { scale: number; x: number; y: number }) {
  state.viewTransform = { ...t }
}

export function exportJSON(): string {
  return JSON.stringify(
    {
      cards: state.cards,
      relations: state.relations,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )
}

export function importJSON(json: string) {
  const data = JSON.parse(json)
  if (data.cards && Array.isArray(data.cards)) {
    state.cards = data.cards.map((c: Card) => ({
      ...c,
      tagColor: c.tagColor || '',
    }))
  }
  if (data.relations && Array.isArray(data.relations)) {
    state.relations = data.relations
  }
}

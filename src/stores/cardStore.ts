import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CardData, RelationData, RelationType, CanvasState } from '../types'

const STORAGE_KEY = 'relation-card-wall-data'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch { /* empty */ }
  return null
}

function saveToStorage(data: { cards: CardData[]; relations: RelationData[]; canvas: CanvasState }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* empty */ }
}

export const useCardStore = defineStore('card', () => {
  const saved = loadFromStorage() as { cards?: CardData[]; relations?: RelationData[]; canvas?: CanvasState } | null

  const cards = ref<CardData[]>(saved?.cards ?? [])
  const relations = ref<RelationData[]>(saved?.relations ?? [])
  const canvas = ref<CanvasState>(saved?.canvas ?? { offsetX: 0, offsetY: 0, scale: 1 })

  const selectedCardIds = ref<Set<string>>(new Set())
  const selectedRelationId = ref<string | null>(null)
  const filterTags = ref<string[]>([])
  const searchKeyword = ref('')
  const bundleMode = ref(false)
  const draggingRelation = ref<{ fromCardId: string; canvasX: number; canvasY: number } | null>(null)

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    cards.value.forEach(c => c.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  })

  const visibleCardIds = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    const tagFilter = filterTags.value
    return new Set(
      cards.value
        .filter(c => {
          if (tagFilter.length > 0 && !c.tags.some(t => tagFilter.includes(t))) return false
          if (keyword && !c.title.toLowerCase().includes(keyword) && !c.summary.toLowerCase().includes(keyword)) return false
          return true
        })
        .map(c => c.id)
    )
  })

  const highlightedCardIds = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return new Set<string>()
    return new Set(
      cards.value
        .filter(c => c.title.toLowerCase().includes(keyword) || c.summary.toLowerCase().includes(keyword))
        .map(c => c.id)
    )
  })

  watch([cards, relations, canvas], () => {
    saveToStorage({ cards: cards.value, relations: relations.value, canvas: canvas.value })
  }, { deep: true })

  function addCard(partial: Partial<CardData> & { title: string }): CardData {
    const card: CardData = {
      id: generateId(),
      title: partial.title,
      summary: partial.summary ?? '',
      tags: partial.tags ?? [],
      tagColor: partial.tagColor ?? '#4A90D9',
      priority: partial.priority ?? 'medium',
      x: partial.x ?? 100,
      y: partial.y ?? 100,
      width: partial.width ?? 240,
      height: partial.height ?? 140,
    }
    cards.value.push(card)
    return card
  }

  function updateCard(id: string, patch: Partial<CardData>) {
    const idx = cards.value.findIndex(c => c.id === id)
    if (idx !== -1) Object.assign(cards.value[idx], patch)
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter(c => c.id !== id)
    relations.value = relations.value.filter(r => r.fromCardId !== id && r.toCardId !== id)
    selectedCardIds.value.delete(id)
  }

  function removeSelectedCards() {
    selectedCardIds.value.forEach(id => {
      cards.value = cards.value.filter(c => c.id !== id)
      relations.value = relations.value.filter(r => r.fromCardId !== id && r.toCardId !== id)
    })
    selectedCardIds.value = new Set()
  }

  function addRelation(fromCardId: string, toCardId: string, type: RelationType): RelationData {
    const existing = relations.value.find(r => r.fromCardId === fromCardId && r.toCardId === toCardId && r.type === type)
    if (existing) return existing
    const rel: RelationData = { id: generateId(), fromCardId, toCardId, type }
    relations.value.push(rel)
    return rel
  }

  function removeRelation(id: string) {
    relations.value = relations.value.filter(r => r.id !== id)
    selectedRelationId.value = null
  }

  function changeRelationType(id: string, type: RelationType) {
    const rel = relations.value.find(r => r.id === id)
    if (rel) rel.type = type
  }

  function toggleCardSelection(id: string, multi: boolean = false) {
    if (multi) {
      if (selectedCardIds.value.has(id)) {
        selectedCardIds.value.delete(id)
      } else {
        selectedCardIds.value.add(id)
      }
    } else {
      selectedCardIds.value = new Set([id])
    }
    selectedRelationId.value = null
  }

  function clearSelection() {
    selectedCardIds.value = new Set()
    selectedRelationId.value = null
  }

  function selectCardsInRect(x1: number, y1: number, x2: number, y2: number) {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2)
    const ids = cards.value
      .filter(c => c.x < maxX && c.x + c.width > minX && c.y < maxY && c.y + c.height > minY)
      .map(c => c.id)
    selectedCardIds.value = new Set(ids)
  }

  function alignSelected(direction: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV') {
    const selected = cards.value.filter(c => selectedCardIds.value.has(c.id))
    if (selected.length < 2) return
    switch (direction) {
      case 'left': {
        const v = Math.min(...selected.map(c => c.x))
        selected.forEach(c => { c.x = v })
        break
      }
      case 'right': {
        const v = Math.max(...selected.map(c => c.x + c.width))
        selected.forEach(c => { c.x = v - c.width })
        break
      }
      case 'top': {
        const v = Math.min(...selected.map(c => c.y))
        selected.forEach(c => { c.y = v })
        break
      }
      case 'bottom': {
        const v = Math.max(...selected.map(c => c.y + c.height))
        selected.forEach(c => { c.y = v - c.height })
        break
      }
      case 'centerH': {
        const avg = selected.reduce((s, c) => s + c.x + c.width / 2, 0) / selected.length
        selected.forEach(c => { c.x = avg - c.width / 2 })
        break
      }
      case 'centerV': {
        const avg = selected.reduce((s, c) => s + c.y + c.height / 2, 0) / selected.length
        selected.forEach(c => { c.y = avg - c.height / 2 })
        break
      }
    }
  }

  function batchColorByTag(tag: string, color: string) {
    cards.value.forEach(c => {
      if (c.tags.includes(tag)) c.tagColor = color
    })
  }

  function exportJSON(): string {
    return JSON.stringify({ cards: cards.value, relations: relations.value, canvas: canvas.value }, null, 2)
  }

  function importJSON(json: string) {
    try {
      const data = JSON.parse(json)
      if (data.cards) cards.value = data.cards
      if (data.relations) relations.value = data.relations
      if (data.canvas) canvas.value = data.canvas
    } catch { /* empty */ }
  }

  return {
    cards, relations, canvas,
    selectedCardIds, selectedRelationId,
    filterTags, searchKeyword, bundleMode, draggingRelation,
    allTags, visibleCardIds, highlightedCardIds,
    addCard, updateCard, removeCard, removeSelectedCards,
    addRelation, removeRelation, changeRelationType,
    toggleCardSelection, clearSelection, selectCardsInRect,
    alignSelected, batchColorByTag,
    exportJSON, importJSON,
  }
})

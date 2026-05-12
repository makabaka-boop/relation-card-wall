import { reactive, computed, watch } from 'vue';
import type { Card, Relation, CanvasState, SelectionBox, RelationType } from './types';
import { loadData, saveData, generateId } from './utils/storage';

const initialData = loadData();

interface State {
  cards: Card[];
  relations: Relation[];
  canvas: CanvasState;
  selectedCards: string[];
  selectionBox: SelectionBox | null;
  isCreatingRelation: boolean;
  relationStart: string | null;
  editingCard: string | null;
  filterTags: string[];
  searchKeyword: string;
  bundleMode: boolean;
}

const state = reactive<State>({
  cards: initialData.cards,
  relations: initialData.relations,
  canvas: initialData.canvas,
  selectedCards: [],
  selectionBox: null,
  isCreatingRelation: false,
  relationStart: null,
  editingCard: null,
  filterTags: [],
  searchKeyword: '',
  bundleMode: false
});

watch(
  () => ({
    cards: state.cards,
    relations: state.relations,
    canvas: state.canvas
  }),
  (data) => {
    saveData(data);
  },
  { deep: true }
);

export function useStore() {
  const allTags = computed(() => {
    const tags = new Set<string>();
    state.cards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  });

  const filteredCards = computed(() => {
    return state.cards.filter(card => {
      if (state.filterTags.length > 0) {
        const hasMatchingTag = state.filterTags.some(tag => card.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase();
        const matchesSearch = 
          card.title.toLowerCase().includes(keyword) ||
          card.summary.toLowerCase().includes(keyword) ||
          card.tags.some(tag => tag.toLowerCase().includes(keyword));
        if (!matchesSearch) return false;
      }
      return true;
    });
  });

  const highlightedCards = computed(() => {
    if (!state.searchKeyword) return new Set<string>();
    const keyword = state.searchKeyword.toLowerCase();
    return new Set(
      state.cards
        .filter(card => 
          card.title.toLowerCase().includes(keyword) ||
          card.summary.toLowerCase().includes(keyword) ||
          card.tags.some(tag => tag.toLowerCase().includes(keyword))
        )
        .map(card => card.id)
    );
  });

  function createCard(x: number, y: number): Card {
    const card: Card = {
      id: generateId(),
      title: '新卡片',
      summary: '点击编辑摘要...',
      tags: [],
      color: '#6366F1',
      priority: 1,
      x,
      y,
      width: 240,
      height: 160
    };
    state.cards.push(card);
    return card;
  }

  function updateCard(id: string, updates: Partial<Card>) {
    const index = state.cards.findIndex(c => c.id === id);
    if (index !== -1) {
      state.cards[index] = { ...state.cards[index], ...updates };
    }
  }

  function deleteCard(id: string) {
    state.cards = state.cards.filter(c => c.id !== id);
    state.relations = state.relations.filter(r => r.from !== id && r.to !== id);
    state.selectedCards = state.selectedCards.filter(cid => cid !== id);
  }

  function createRelation(from: string, to: string, type: RelationType): Relation | null {
    if (from === to) return null;
    const exists = state.relations.some(r => r.from === from && r.to === to && r.type === type);
    if (exists) return null;
    
    const relation: Relation = {
      id: generateId(),
      from,
      to,
      type
    };
    state.relations.push(relation);
    return relation;
  }

  function deleteRelation(id: string) {
    state.relations = state.relations.filter(r => r.id !== id);
  }

  function setZoom(zoom: number) {
    state.canvas.zoom = Math.max(0.1, Math.min(3, zoom));
  }

  function setPan(x: number, y: number) {
    state.canvas.panX = x;
    state.canvas.panY = y;
  }

  function selectCard(id: string, multi = false) {
    if (multi) {
      if (state.selectedCards.includes(id)) {
        state.selectedCards = state.selectedCards.filter(cid => cid !== id);
      } else {
        state.selectedCards.push(id);
      }
    } else {
      state.selectedCards = [id];
    }
  }

  function clearSelection() {
    state.selectedCards = [];
  }

  function selectCardsInBox(minX: number, minY: number, maxX: number, maxY: number) {
    state.selectedCards = state.cards
      .filter(card => 
        card.x >= minX && 
        card.y >= minY && 
        card.x + card.width <= maxX && 
        card.y + card.height <= maxY
      )
      .map(card => card.id);
  }

  function alignSelectedCards(alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') {
    if (state.selectedCards.length < 2) return;
    
    const cards = state.cards.filter(c => state.selectedCards.includes(c.id));
    if (cards.length === 0) return;

    switch (alignment) {
      case 'left': {
        const minX = Math.min(...cards.map(c => c.x));
        cards.forEach(c => updateCard(c.id, { x: minX }));
        break;
      }
      case 'right': {
        const maxX = Math.max(...cards.map(c => c.x + c.width));
        cards.forEach(c => updateCard(c.id, { x: maxX - c.width }));
        break;
      }
      case 'top': {
        const minY = Math.min(...cards.map(c => c.y));
        cards.forEach(c => updateCard(c.id, { y: minY }));
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...cards.map(c => c.y + c.height));
        cards.forEach(c => updateCard(c.id, { y: maxY - c.height }));
        break;
      }
      case 'center-h': {
        const avgX = cards.reduce((sum, c) => sum + c.x, 0) / cards.length;
        cards.forEach(c => updateCard(c.id, { x: avgX }));
        break;
      }
      case 'center-v': {
        const avgY = cards.reduce((sum, c) => sum + c.y, 0) / cards.length;
        cards.forEach(c => updateCard(c.id, { y: avgY }));
        break;
      }
    }
  }

  function batchSetColorByTag(tag: string, color: string) {
    state.cards.forEach(card => {
      if (card.tags.includes(tag)) {
        updateCard(card.id, { color });
      }
    });
  }

  function startRelationCreation(cardId: string) {
    state.isCreatingRelation = true;
    state.relationStart = cardId;
  }

  function cancelRelationCreation() {
    state.isCreatingRelation = false;
    state.relationStart = null;
  }

  function finishRelationCreation(cardId: string, type: RelationType) {
    if (state.relationStart) {
      createRelation(state.relationStart, cardId, type);
    }
    cancelRelationCreation();
  }

  function setFilterTags(tags: string[]) {
    state.filterTags = tags;
  }

  function setSearchKeyword(keyword: string) {
    state.searchKeyword = keyword;
  }

  function toggleBundleMode() {
    state.bundleMode = !state.bundleMode;
  }

  function exportJSON(): string {
    const data = {
      cards: state.cards,
      relations: state.relations,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  function importJSON(json: string) {
    try {
      const data = JSON.parse(json);
      if (data.cards) state.cards = data.cards;
      if (data.relations) state.relations = data.relations;
    } catch (e) {
      console.error('Failed to import JSON:', e);
    }
  }

  return {
    state,
    allTags,
    filteredCards,
    highlightedCards,
    createCard,
    updateCard,
    deleteCard,
    createRelation,
    deleteRelation,
    setZoom,
    setPan,
    selectCard,
    clearSelection,
    selectCardsInBox,
    alignSelectedCards,
    batchSetColorByTag,
    startRelationCreation,
    cancelRelationCreation,
    finishRelationCreation,
    setFilterTags,
    setSearchKeyword,
    toggleBundleMode,
    exportJSON,
    importJSON
  };
}

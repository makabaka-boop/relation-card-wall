<template>
  <div class="card-item"
    :class="{
      selected: store.selectedCardIds.has(card.id),
      highlighted: store.highlightedCardIds.has(card.id),
      dimmed: !store.visibleCardIds.has(card.id),
      [`priority-${card.priority}`]: true
    }"
    :style="{
      left: card.x + 'px',
      top: card.y + 'px',
      width: card.width + 'px',
      height: card.height + 'px',
      '--tag-color': card.tagColor,
    }"
    @mousedown.stop="onMouseDown"
    @dblclick.stop="$emit('dblclick', card)"
    :data-card-id="card.id"
  >
    <div class="card-priority-bar"></div>
    <div class="card-header">
      <span class="card-title" :title="card.title">{{ card.title }}</span>
      <span class="card-priority-badge" :style="{ background: PRIORITY_COLORS[card.priority] }">
        {{ PRIORITY_LABELS[card.priority] }}
      </span>
    </div>
    <div class="card-summary" :title="card.summary">{{ card.summary }}</div>
    <div class="card-tags">
      <span v-for="tag in card.tags" :key="tag" class="card-tag" :style="{ borderColor: card.tagColor, color: card.tagColor }">
        {{ tag }}
      </span>
    </div>
    <div class="card-relations-in" @mousedown.stop="startCreatingRelation($event)">
      <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="4" x2="7" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.5"/></svg>
    </div>
    <div v-if="store.selectedCardIds.has(card.id)" class="card-delete" @mousedown.stop="onDelete" title="删除">
      <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardStore } from '../stores/cardStore'
import type { CardData } from '../types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../types'

const props = defineProps<{ card: CardData }>()
const emit = defineEmits<{ dblclick: [card: CardData] }>()
const store = useCardStore()

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const multi = e.shiftKey || e.ctrlKey || e.metaKey
  store.toggleCardSelection(props.card.id, multi)
  store.selectedRelationId = null

  const startX = e.clientX
  const startY = e.clientY
  const origX = props.card.x
  const origY = props.card.y
  const isMultiSelected = store.selectedCardIds.has(props.card.id) && store.selectedCardIds.size > 1
  const origPositions = isMultiSelected
    ? store.cards
        .filter(c => store.selectedCardIds.has(c.id))
        .map(c => ({ id: c.id, x: c.x, y: c.y }))
    : []

  function onMove(ev: MouseEvent) {
    const dx = (ev.clientX - startX) / store.canvas.scale
    const dy = (ev.clientY - startY) / store.canvas.scale
    if (isMultiSelected) {
      origPositions.forEach(p => {
        store.updateCard(p.id, { x: p.x + dx, y: p.y + dy })
      })
    } else {
      store.updateCard(props.card.id, { x: origX + dx, y: origY + dy })
    }
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function startCreatingRelation(e: MouseEvent) {
  e.preventDefault()
  store.selectedRelationId = null
  store.selectedCardIds = new Set([props.card.id])
  const startId = props.card.id

  const container = document.querySelector('.canvas-container') as HTMLElement
  if (!container) return
  const cr = container.getBoundingClientRect()
  const toCanvas = (ex: number, ey: number) => ({
    x: (ex - cr.left - store.canvas.offsetX) / store.canvas.scale,
    y: (ey - cr.top - store.canvas.offsetY) / store.canvas.scale,
  })
  const pos = toCanvas(e.clientX, e.clientY)
  store.draggingRelation = { fromCardId: startId, canvasX: pos.x, canvasY: pos.y }

  function onMove(ev: MouseEvent) {
    if (store.draggingRelation) {
      const p = toCanvas(ev.clientX, ev.clientY)
      store.draggingRelation.canvasX = p.x
      store.draggingRelation.canvasY = p.y
    }
  }
  function onUp(ev: MouseEvent) {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    store.draggingRelation = null
    const el = document.elementFromPoint(ev.clientX, ev.clientY)
    const cardEl = el?.closest('.card-item')
    if (cardEl) {
      const targetId = (cardEl as HTMLElement).dataset?.cardId
      if (targetId && targetId !== startId) {
        store.addRelation(startId, targetId, 'reference')
      }
    }
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onDelete() {
  store.removeCard(props.card.id)
}
</script>

<style scoped>
.card-item {
  position: absolute;
  background: #fff;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: grab;
  user-select: none;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  transition: box-shadow 0.15s, border-color 0.15s;
  z-index: 1;
}
.card-item:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.card-item.selected {
  border-color: #4A90D9;
  box-shadow: 0 0 0 2px rgba(74,144,217,0.3);
  z-index: 2;
}
.card-item.highlighted {
  border-color: #FFD700;
  box-shadow: 0 0 12px rgba(255,215,0,0.5);
}
.card-item.dimmed {
  opacity: 0.25;
  pointer-events: none;
}
.card-priority-bar {
  height: 4px;
  width: 100%;
  background: var(--tag-color, #ccc);
  flex-shrink: 0;
}
.priority-low .card-priority-bar { background: #8BC34A; }
.priority-medium .card-priority-bar { background: #FF9800; }
.priority-high .card-priority-bar { background: #F44336; }
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 2px;
  gap: 6px;
}
.card-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.card-priority-badge {
  font-size: 10px;
  color: #fff;
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
}
.card-summary {
  font-size: 11px;
  color: #666;
  padding: 2px 10px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 10px 6px;
}
.card-tag {
  font-size: 10px;
  border: 1px solid;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
}
.card-relations-in {
  position: absolute;
  right: 4px;
  bottom: 4px;
  color: #999;
  cursor: crosshair;
  opacity: 0;
  transition: opacity 0.15s;
}
.card-item:hover .card-relations-in {
  opacity: 1;
}
.card-relations-in:hover {
  color: #4A90D9;
}
.card-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #999;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.card-item:hover .card-delete,
.card-item.selected .card-delete {
  opacity: 1;
}
.card-delete:hover {
  color: #F44336;
}
</style>

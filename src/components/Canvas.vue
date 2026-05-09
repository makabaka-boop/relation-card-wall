<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import CardItem from './CardItem.vue'
import { state, addCard, updateCard, deleteCard, addRelation, toggleCardSelection, clearSelection, setViewTransform } from '../store'
import type { Card, RelationType } from '../types'
import { RELATION_CONFIG } from '../types'
import { computeBundlePaths, pointsToSvgPath, getCardEdgePoint, getCardCenter } from '../utils/bundler'
import { cardMatchesKeyword } from '../utils/layout'

const emit = defineEmits<{
  (e: 'canvasClick'): void
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const isPanning = ref(false)
const isBoxSelecting = ref(false)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragCardId = ref<string | null>(null)
const dragCardOffset = ref({ x: 0, y: 0 })
const boxStart = ref({ x: 0, y: 0 })
const boxEnd = ref({ x: 0, y: 0 })

const isCreatingRelation = ref(false)
const relationSourceId = ref<string | null>(null)
const relationEndPoint = ref({ x: 0, y: 0 })

const containerSize = ref({ width: 800, height: 600 })

function updateSize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerSize.value = { width: rect.width, height: rect.height }
  }
}

onMounted(() => {
  updateSize()
  window.addEventListener('resize', updateSize)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('keydown', handleKeyDown)
})

const transform = computed(() => {
  const { scale, x, y } = state.viewTransform
  return `translate(${x}, ${y}) scale(${scale})`
})

const visibleCards = computed(() => {
  if (state.filterTags.length === 0) return state.cards
  return state.cards.filter((c) => c.tag && state.filterTags.includes(c.tag))
})

const visibleRelations = computed(() => {
  const visibleIds = new Set(visibleCards.value.map((c) => c.id))
  return state.relations.filter((r) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId))
})

const bundlePaths = computed(() => {
  return computeBundlePaths(state.cards, visibleRelations.value, state.bundleMode)
})

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const { scale, x, y } = state.viewTransform
  return {
    x: (sx - x) / scale,
    y: (sy - y) / scale,
  }
}

function getSvgPoint(e: MouseEvent): { x: number; y: number } {
  if (!svgRef.value) return { x: 0, y: 0 }
  const rect = svgRef.value.getBoundingClientRect()
  return screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const { scale, x, y } = state.viewTransform
  const rect = svgRef.value!.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(3, scale * zoomFactor))

  const worldX = (mouseX - x) / scale
  const worldY = (mouseY - y) / scale

  setViewTransform({
    scale: newScale,
    x: mouseX - worldX * newScale,
    y: mouseY - worldY * newScale,
  })
}

function handleCanvasMouseDown(e: MouseEvent) {
  const target = e.target as SVGElement
  if (target.closest('.card-wrapper')) return
  if (target.closest('.relation-line')) return

  const rect = svgRef.value!.getBoundingClientRect()
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top

  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning.value = true
    dragStart.value = { x: screenX - state.viewTransform.x, y: screenY - state.viewTransform.y }
  } else if (e.button === 0) {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      isBoxSelecting.value = true
      const world = screenToWorld(screenX, screenY)
      boxStart.value = world
      boxEnd.value = world
    } else {
      clearSelection()
      emit('canvasClick')
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top

  if (isPanning.value) {
    setViewTransform({
      ...state.viewTransform,
      x: screenX - dragStart.value.x,
      y: screenY - dragStart.value.y,
    })
  } else if (isBoxSelecting.value) {
    boxEnd.value = screenToWorld(screenX, screenY)
  } else if (isDragging.value && dragCardId.value) {
    const world = screenToWorld(screenX, screenY)
    updateCard(dragCardId.value, {
      x: world.x - dragCardOffset.value.x,
      y: world.y - dragCardOffset.value.y,
    })
  } else if (isCreatingRelation.value) {
    relationEndPoint.value = screenToWorld(screenX, screenY)
  }
}

function handleMouseUp(e: MouseEvent) {
  if (isBoxSelecting.value) {
    const x1 = Math.min(boxStart.value.x, boxEnd.value.x)
    const x2 = Math.max(boxStart.value.x, boxEnd.value.x)
    const y1 = Math.min(boxStart.value.y, boxEnd.value.y)
    const y2 = Math.max(boxStart.value.y, boxEnd.value.y)

    const newSelected: string[] = []
    for (const card of visibleCards.value) {
      if (card.x < x2 && card.x + card.width > x1 && card.y < y2 && card.y + card.height > y1) {
        newSelected.push(card.id)
      }
    }
    state.selectedCardIds = newSelected
    isBoxSelecting.value = false
  }

  if (isCreatingRelation.value && relationSourceId.value) {
    const targetCard = findCardAtPoint(relationEndPoint.value.x, relationEndPoint.value.y)
    if (targetCard && targetCard.id !== relationSourceId.value) {
      askRelationType(relationSourceId.value, targetCard.id)
    }
    isCreatingRelation.value = false
    relationSourceId.value = null
  }

  isPanning.value = false
  isDragging.value = false
  dragCardId.value = null
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedCardIds.length > 0) {
    if (confirm(`确定要删除选中的 ${state.selectedCardIds.length} 张卡片吗？`)) {
      [...state.selectedCardIds].forEach((id) => deleteCard(id))
    }
  }
  if (e.key === 'Escape') {
    isCreatingRelation.value = false
    relationSourceId.value = null
    clearSelection()
  }
}

function findCardAtPoint(x: number, y: number): Card | undefined {
  return state.cards.find(
    (c) => x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height,
  )
}

function askRelationType(sourceId: string, targetId: string) {
  const type = prompt(
    '选择关系类型：\n1 - 引用 (蓝色实线)\n2 - 依赖 (绿色虚线)\n3 - 冲突 (红色点线)\n\n请输入 1-3：',
    '1',
  )
  if (!type) return
  const typeMap: Record<string, RelationType> = {
    '1': 'reference',
    '2': 'dependency',
    '3': 'conflict',
  }
  const relationType = typeMap[type] || 'reference'
  try {
    addRelation({ sourceId, targetId, type: relationType })
  } catch (err: any) {
    alert(err.message)
  }
}

function handleCardDragStart(id: string, e: MouseEvent) {
  const card = state.cards.find((c) => c.id === id)
  if (!card) return
  const world = getSvgPoint(e)
  isDragging.value = true
  dragCardId.value = id
  dragCardOffset.value = {
    x: world.x - card.x,
    y: world.y - card.y,
  }
  if (!state.selectedCardIds.includes(id)) {
    toggleCardSelection(id, e.shiftKey || e.metaKey || e.ctrlKey)
  }
}

function handleCardSelect(id: string, additive: boolean) {
  toggleCardSelection(id, additive)
}

function handleCardUpdate(id: string, updates: Partial<Card>) {
  updateCard(id, updates)
}

function handleCardDelete(id: string) {
  deleteCard(id)
}

function handleStartRelation(id: string, e: MouseEvent) {
  isCreatingRelation.value = true
  relationSourceId.value = id
  const card = state.cards.find((c) => c.id === id)
  if (card) {
    relationEndPoint.value = getCardCenter(card)
  }
}

function handleDoubleClick(e: MouseEvent) {
  const target = e.target as SVGElement
  if (target.closest('.card-wrapper')) return
  const world = getSvgPoint(e)
  addCard({
    x: world.x - 110,
    y: world.y - 70,
    title: '新卡片',
    summary: '',
    tag: '',
    priority: 3,
  })
}

const boxRect = computed(() => {
  if (!isBoxSelecting.value) return null
  return {
    x: Math.min(boxStart.value.x, boxEnd.value.x),
    y: Math.min(boxStart.value.y, boxEnd.value.y),
    width: Math.abs(boxEnd.value.x - boxStart.value.x),
    height: Math.abs(boxEnd.value.y - boxStart.value.y),
  }
})

const previewRelationPath = computed(() => {
  if (!isCreatingRelation.value || !relationSourceId.value) return ''
  const source = state.cards.find((c) => c.id === relationSourceId.value)
  if (!source) return ''
  const start = getCardEdgePoint(source, relationEndPoint.value.x, relationEndPoint.value.y)
  return `M ${start.x} ${start.y} L ${relationEndPoint.value.x} ${relationEndPoint.value.y}`
})

function getBundlePathForRelation(relationId: string): string {
  const bp = bundlePaths.value.find((p) => p.relationId === relationId)
  return bp ? pointsToSvgPath(bp.points) : ''
}

function getRelationConfig(type: RelationType) {
  return RELATION_CONFIG[type]
}

function isCardHighlighted(card: Card): boolean {
  if (!state.highlightKeyword) return false
  return cardMatchesKeyword(card, state.highlightKeyword)
}

function isCardFiltered(card: Card): boolean {
  if (state.filterTags.length === 0) return false
  return !state.filterTags.includes(card.tag)
}
</script>

<template>
  <div ref="containerRef" class="canvas-container">
    <svg
      ref="svgRef"
      class="canvas-svg"
      :width="containerSize.width"
      :height="containerSize.height"
      @wheel="handleWheel"
      @mousedown="handleCanvasMouseDown"
      @dblclick="handleDoubleClick"
    >
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
        <marker
          v-for="(config, type) in RELATION_CONFIG"
          :key="type"
          :id="`arrow-${type}`"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" :fill="config.color" />
        </marker>
      </defs>

      <rect
        :width="containerSize.width / state.viewTransform.scale + 2000"
        :height="containerSize.height / state.viewTransform.scale + 2000"
        x="-1000"
        y="-1000"
        fill="url(#grid)"
        :transform="transform"
      />

      <g :transform="transform">
        <g class="relations-layer">
          <path
            v-for="rel in visibleRelations"
            :key="rel.id"
            :d="getBundlePathForRelation(rel.id)"
            :stroke="getRelationConfig(rel.type).color"
            :stroke-dasharray="getRelationConfig(rel.type).strokeDasharray || 'none'"
            stroke-width="2"
            fill="none"
            :marker-end="`url(#arrow-${rel.type})`"
            class="relation-line"
          />
        </g>

        <g v-if="isCreatingRelation" class="relation-preview">
          <path
            :d="previewRelationPath"
            stroke="#10b981"
            stroke-width="2"
            stroke-dasharray="6 4"
            fill="none"
            marker-end="url(#arrow-reference)"
          />
        </g>

        <g class="cards-layer">
          <CardItem
            v-for="card in visibleCards"
            :key="card.id"
            :card="card"
            :is-selected="state.selectedCardIds.includes(card.id)"
            :scale="state.viewTransform.scale"
            :is-highlighted="isCardHighlighted(card)"
            :is-filtered="isCardFiltered(card)"
            @select="handleCardSelect"
            @drag-start="handleCardDragStart"
            @update="handleCardUpdate"
            @delete="handleCardDelete"
            @start-relation="handleStartRelation"
          />
        </g>

        <rect
          v-if="boxRect"
          :x="boxRect.x"
          :y="boxRect.y"
          :width="boxRect.width"
          :height="boxRect.height"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgba(59, 130, 246, 0.5)"
          stroke-width="1"
          stroke-dasharray="4 2"
          class="box-select"
        />
      </g>
    </svg>
    <div class="canvas-hint">
      <span>双击创建卡片 · Alt+拖拽平移 · 滚轮缩放 · Shift+拖拽框选</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f1f5f9;
}

.canvas-svg {
  display: block;
  cursor: default;
}

.relation-line {
  pointer-events: stroke;
  cursor: pointer;
}

.relation-line:hover {
  stroke-width: 3 !important;
}

.box-select {
  pointer-events: none;
}

.canvas-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  pointer-events: none;
}
</style>

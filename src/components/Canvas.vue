<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Card, RelationType } from '../types';
import { RELATION_CONFIG } from '../types';
import CardComponent from './CardComponent.vue';
import RelationLine from './RelationLine.vue';
import { calculateBundledPaths } from '../utils/bundle';

interface Props {
  cards: Card[];
  relations: Array<{ id: string; from: string; to: string; type: RelationType }>;
  selectedCards: string[];
  highlightedCards: Set<string>;
  zoom: number;
  panX: number;
  panY: number;
  bundleMode: boolean;
  isCreatingRelation: boolean;
  relationStart: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'create-card', x: number, y: number): void;
  (e: 'update-card', id: string, updates: Partial<Card>): void;
  (e: 'delete-card', id: string): void;
  (e: 'select-card', id: string, multi: boolean): void;
  (e: 'clear-selection'): void;
  (e: 'select-in-box', minX: number, minY: number, maxX: number, maxY: number): void;
  (e: 'start-relation', id: string): void;
  (e: 'end-relation', id: string): void;
  (e: 'cancel-relation'): void;
  (e: 'delete-relation', id: string): void;
  (e: 'zoom', delta: number): void;
  (e: 'pan', dx: number, dy: number): void;
}>();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

defineExpose({
  getSvgElement: () => svgRef.value
});

const isPanning = ref(false);
const isSelecting = ref(false);
const selectionStart = ref({ x: 0, y: 0 });
const selectionEnd = ref({ x: 0, y: 0 });
const mousePos = ref({ x: 0, y: 0 });
const dragStartPos = ref(new Map<string, { x: number; y: number }>());

const bundledPaths = computed(() => {
  return calculateBundledPaths(props.relations as any, props.cards, props.bundleMode);
});

const transform = computed(() => {
  return `translate(${props.panX}, ${props.panY}) scale(${props.zoom})`;
});

const selectionBoxRect = computed(() => {
  return {
    x: Math.min(selectionStart.value.x, selectionEnd.value.x),
    y: Math.min(selectionStart.value.y, selectionEnd.value.y),
    width: Math.abs(selectionEnd.value.x - selectionStart.value.x),
    height: Math.abs(selectionEnd.value.y - selectionStart.value.y)
  };
});

function screenToCanvas(screenX: number, screenY: number) {
  return {
    x: (screenX - props.panX) / props.zoom,
    y: (screenY - props.panY) / props.zoom
  };
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;
  
  if (props.isCreatingRelation) {
    emit('cancel-relation');
    return;
  }
  
  const pos = screenToCanvas(event.clientX, event.clientY);
  
  if (event.shiftKey || event.detail === 2) {
    isSelecting.value = true;
    selectionStart.value = pos;
    selectionEnd.value = pos;
  } else {
    isPanning.value = true;
    emit('clear-selection');
  }
}

function handleMouseMove(event: MouseEvent) {
  const pos = screenToCanvas(event.clientX, event.clientY);
  mousePos.value = pos;
  
  if (isPanning.value) {
    emit('pan', event.movementX, event.movementY);
  } else if (isSelecting.value) {
    selectionEnd.value = pos;
  }
}

function handleMouseUp(event: MouseEvent) {
  if (isSelecting.value) {
    const rect = selectionBoxRect.value;
    if (rect.width > 10 && rect.height > 10) {
      emit('select-in-box', rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
    }
    isSelecting.value = false;
  }
  
  isPanning.value = false;
}

function handleDoubleClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.tagName === 'svg' || target.tagName === 'rect' || target.closest('.canvas-container')) {
    const pos = screenToCanvas(event.clientX, event.clientY);
    emit('create-card', pos.x - 120, pos.y - 80);
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  emit('zoom', delta);
}

function onCardDragStart(cardId: string, event: MouseEvent) {
  dragStartPos.value.clear();
  props.selectedCards.forEach(id => {
    const card = props.cards.find(c => c.id === id);
    if (card) {
      dragStartPos.value.set(id, { x: card.x, y: card.y });
    }
  });
  if (!dragStartPos.value.has(cardId)) {
    const card = props.cards.find(c => c.id === cardId);
    if (card) {
      dragStartPos.value.set(cardId, { x: card.x, y: card.y });
    }
  }
}

function onCardDrag(cardId: string, event: MouseEvent) {
  const affectedCards = dragStartPos.value.size > 0 ? dragStartPos.value : new Map([[cardId, { x: 0, y: 0 }]]);
  
  affectedCards.forEach((startPos, id) => {
    const originalCard = props.cards.find(c => c.id === id);
    if (originalCard) {
      const dx = event.movementX / props.zoom;
      const dy = event.movementY / props.zoom;
      emit('update-card', id, {
        x: originalCard.x + dx,
        y: originalCard.y + dy
      });
    }
  });
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <div
    ref="containerRef"
    class="canvas-container"
    :class="{ grabbing: isPanning }"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
    @wheel="handleWheel"
  >
    <svg
      ref="svgRef"
      class="canvas-svg"
      :width="'100%'"
      :height="'100%'"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" stroke-width="0.5" />
        </pattern>
      </defs>
      
      <rect
        x="-10000"
        y="-10000"
        width="20000"
        height="20000"
        fill="url(#grid)"
        :transform="transform"
      />
      
      <g :transform="transform">
        <RelationLine
          v-for="rel in relations"
          :key="rel.id"
          :relation="rel as any"
          :path="bundledPaths.get(rel.id) || []"
          @delete="emit('delete-relation', rel.id)"
        />
        
        <line
          v-if="isCreatingRelation && relationStart"
          :x1="cards.find(c => c.id === relationStart)?.x! + 120"
          :y1="cards.find(c => c.id === relationStart)?.y! + 80"
          :x2="mousePos.x"
          :y2="mousePos.y"
          stroke="#6366F1"
          stroke-width="2"
          stroke-dasharray="6,4"
        />
        
        <CardComponent
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :selected="selectedCards.includes(card.id)"
          :highlighted="highlightedCards.has(card.id)"
          :is-creating-relation="isCreatingRelation"
          @select="emit('select-card', card.id, $event)"
          @drag-start="onCardDragStart(card.id, $event)"
          @drag="onCardDrag(card.id, $event)"
          @start-relation="emit('start-relation', card.id)"
          @end-relation="emit('end-relation', card.id)"
          @update="emit('update-card', card.id, $event)"
          @delete="emit('delete-card', card.id)"
        />
        
        <rect
          v-if="isSelecting"
          :x="selectionBoxRect.x"
          :y="selectionBoxRect.y"
          :width="selectionBoxRect.width"
          :height="selectionBoxRect.height"
          fill="#6366F120"
          stroke="#6366F1"
          stroke-width="2"
          stroke-dasharray="4,4"
          class="selection-box"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.selection-box {
  pointer-events: none;
}
</style>

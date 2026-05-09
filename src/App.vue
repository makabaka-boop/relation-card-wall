<template>
  <div class="app-root">
    <Toolbar
      @addCard="openAddCard"
      @exportPNG="exportPNG"
      @exportJSON="exportJSON"
      @importJSON="triggerImportJSON"
    />

    <div
      class="canvas-container"
      ref="containerRef"
      @mousedown="onCanvasMouseDown"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
      :style="{ backgroundSize: `${20 * store.canvas.scale}px ${20 * store.canvas.scale}px` }"
    >
      <div
        class="canvas-transform"
        :style="{
          transform: `translate(${store.canvas.offsetX}px, ${store.canvas.offsetY}px) scale(${store.canvas.scale})`,
          transformOrigin: '0 0',
        }"
      >
        <RelationLines />
        <CardItem
          v-for="card of store.cards"
          :key="card.id"
          :card="card"
          :data-card-id="card.id"
          @dblclick="onCardDblClick"
        />
      </div>

      <div
        v-if="boxSelect.active"
        class="box-select-rect"
        :style="{
          left: boxSelect.rectX + 'px',
          top: boxSelect.rectY + 'px',
          width: boxSelect.rectW + 'px',
          height: boxSelect.rectH + 'px',
        }"
      ></div>

      <div class="canvas-hint">
        滚轮缩放 · 右键/空格+拖拽平移 · 框选多选 · 双击卡片编辑 · 点击 + 建立关系
      </div>
    </div>

    <CardEditModal
      v-if="editModal.show"
      :card="editModal.card"
      :defaultX="editModal.x"
      :defaultY="editModal.y"
      @close="editModal.show = false"
      @save="onCardSave"
    />

    <input
      type="file"
      ref="fileInputRef"
      accept=".json"
      style="display:none"
      @change="onFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useCardStore } from './stores/cardStore'
import type { CardData } from './types'
import CardItem from './components/CardItem.vue'
import RelationLines from './components/RelationLines.vue'
import Toolbar from './components/Toolbar.vue'
import CardEditModal from './components/CardEditModal.vue'

const store = useCardStore()
const containerRef = ref<HTMLDivElement>()
const fileInputRef = ref<HTMLInputElement>()

const editModal = reactive<{
  show: boolean
  card?: CardData
  x: number
  y: number
  mode: 'add' | 'edit'
}>({
  show: false,
  card: undefined,
  x: 100,
  y: 100,
  mode: 'add',
})

const boxSelect = reactive({
  active: false,
  startX: 0,
  startY: 0,
  rectX: 0,
  rectY: 0,
  rectW: 0,
  rectH: 0,
})

const spaceDown = ref(false)
const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0, ox: 0, oy: 0 })

function openAddCard() {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const cx = (rect.width / 2 - store.canvas.offsetX) / store.canvas.scale
  const cy = (rect.height / 2 - store.canvas.offsetY) / store.canvas.scale
  editModal.card = undefined
  editModal.x = cx - 120
  editModal.y = cy - 70
  editModal.mode = 'add'
  editModal.show = true
}

function onCardDblClick(card: CardData) {
  editModal.card = card
  editModal.x = card.x
  editModal.y = card.y
  editModal.mode = 'edit'
  editModal.show = true
}

function onCardSave(data: Partial<CardData> & { title: string }) {
  if (editModal.mode === 'edit' && editModal.card) {
    store.updateCard(editModal.card.id, data)
  } else {
    store.addCard(data)
  }
  editModal.show = false
}

function onCanvasMouseDown(e: MouseEvent) {
  if (e.target !== containerRef.value && !(e.target as HTMLElement).classList.contains('canvas-transform')) return

  if (e.button === 2 || (e.button === 0 && spaceDown.value)) {
    isPanning.value = true
    panStart.x = e.clientX
    panStart.y = e.clientY
    panStart.ox = store.canvas.offsetX
    panStart.oy = store.canvas.offsetY

    const onMove = (ev: MouseEvent) => {
      if (!isPanning.value) return
      store.canvas.offsetX = panStart.ox + (ev.clientX - panStart.x)
      store.canvas.offsetY = panStart.oy + (ev.clientY - panStart.y)
    }
    const onUp = () => {
      isPanning.value = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return
  }

  if (e.button === 0) {
    store.clearSelection()
    boxSelect.active = true
    boxSelect.startX = e.clientX
    boxSelect.startY = e.clientY
    boxSelect.rectX = e.clientX
    boxSelect.rectY = e.clientY
    boxSelect.rectW = 0
    boxSelect.rectH = 0

    const onMove = (ev: MouseEvent) => {
      if (!boxSelect.active) return
      const sx = boxSelect.startX, sy = boxSelect.startY
      boxSelect.rectX = Math.min(sx, ev.clientX)
      boxSelect.rectY = Math.min(sy, ev.clientY)
      boxSelect.rectW = Math.abs(ev.clientX - sx)
      boxSelect.rectH = Math.abs(ev.clientY - sy)
    }
    const onUp = () => {
      if (boxSelect.active && boxSelect.rectW > 5 && boxSelect.rectH > 5) {
        const container = containerRef.value
        if (container) {
          const cr = container.getBoundingClientRect()
          const x1 = (boxSelect.rectX - cr.left - store.canvas.offsetX) / store.canvas.scale
          const y1 = (boxSelect.rectY - cr.top - store.canvas.offsetY) / store.canvas.scale
          const x2 = (boxSelect.rectX + boxSelect.rectW - cr.left - store.canvas.offsetX) / store.canvas.scale
          const y2 = (boxSelect.rectY + boxSelect.rectH - cr.top - store.canvas.offsetY) / store.canvas.scale
          store.selectCardsInRect(x1, y1, x2, y2)
        }
      }
      boxSelect.active = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}

function onWheel(e: WheelEvent) {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const oldScale = store.canvas.scale
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.min(Math.max(oldScale * delta, 0.1), 5)

  store.canvas.offsetX = mx - (mx - store.canvas.offsetX) * (newScale / oldScale)
  store.canvas.offsetY = my - (my - store.canvas.offsetY) * (newScale / oldScale)
  store.canvas.scale = newScale
}

function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.code === 'Space') {
    spaceDown.value = true
    e.preventDefault()
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedRelationId) {
      store.removeRelation(store.selectedRelationId)
    } else if (store.selectedCardIds.size > 0) {
      store.removeSelectedCards()
    }
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    spaceDown.value = false
  }
}

async function exportPNG() {
  const container = containerRef.value
  if (!container) return

  const { default: html2canvas } = await import('html2canvas-pro')
  const canvas = await html2canvas(container, {
    backgroundColor: '#f5f5f5',
    scale: 2,
    useCORS: true,
  })
  const link = document.createElement('a')
  link.download = `relation-card-wall-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function exportJSON() {
  const json = store.exportJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = `relation-card-wall-${Date.now()}.json`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}

function triggerImportJSON() {
  fileInputRef.value?.click()
}

function onFileImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    store.importJSON(reader.result as string)
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<style scoped>
.app-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.canvas-container {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
  background-image:
    radial-gradient(circle, #ddd 1px, transparent 1px);
  background-size: 20px 20px;
  overflow: hidden;
  cursor: default;
}
.canvas-container:has(.canvas-transform:active) {
  cursor: grabbing;
}
.canvas-transform {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
}
.box-select-rect {
  position: fixed;
  border: 1px dashed #4A90D9;
  background: rgba(74, 144, 217, 0.08);
  pointer-events: none;
  z-index: 50;
}
.canvas-hint {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #aaa;
  pointer-events: none;
  white-space: nowrap;
}
</style>

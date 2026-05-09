<script setup lang="ts">
import { computed, ref } from 'vue'
import { state, updateCard, addCard, exportJSON, importJSON, clearSelection } from '../store'
import { TAG_COLORS, RELATION_CONFIG } from '../types'
import { alignCards } from '../utils/layout'
import { distillTagColor } from '../utils/layout'

const props = defineProps<{
  allTags: string[]
}>()

const emit = defineEmits<{
  (e: 'export-png'): void
}>()

const searchKeyword = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const bulkTagInput = ref('')
const bulkTagColor = ref('#6366f1')

const selectedCards = computed(() =>
  state.cards.filter((c) => state.selectedCardIds.includes(c.id)),
)

function handleSearchChange() {
  state.highlightKeyword = searchKeyword.value.trim()
}

function addNewCard() {
  const newCard = addCard({
    x: -state.viewTransform.x / state.viewTransform.scale + 100,
    y: -state.viewTransform.y / state.viewTransform.scale + 100,
    title: '新卡片',
    summary: '',
    tag: '',
    priority: 3,
  })
  state.selectedCardIds = [newCard.id]
}

function alignSelected(mode: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') {
  if (selectedCards.value.length < 2) {
    alert('请至少选择 2 张卡片进行对齐')
    return
  }
  const updates = alignCards(selectedCards.value, mode)
  for (const [id, update] of Object.entries(updates)) {
    updateCard(id, update)
  }
}

function applyTagToSelected() {
  if (!bulkTagInput.value.trim()) return
  for (const id of state.selectedCardIds) {
    updateCard(id, { tag: bulkTagInput.value.trim(), tagColor: bulkTagColor.value })
  }
  bulkTagInput.value = ''
}

function applyPriorityToSelected(priority: 1 | 2 | 3 | 4 | 5) {
  for (const id of state.selectedCardIds) {
    updateCard(id, { priority })
  }
}

function toggleBundleMode() {
  state.bundleMode = !state.bundleMode
}

function resetView() {
  state.viewTransform = { scale: 1, x: 0, y: 0 }
}

function zoomIn() {
  const { scale, x, y } = state.viewTransform
  const newScale = Math.min(3, scale * 1.2)
  state.viewTransform = { scale: newScale, x, y }
}

function zoomOut() {
  const { scale, x, y } = state.viewTransform
  const newScale = Math.max(0.1, scale / 1.2)
  state.viewTransform = { scale: newScale, x, y }
}

function downloadJSON() {
  const data = exportJSON()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relation-card-wall-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInputRef.value?.click()
}

function handleFileImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const content = ev.target?.result as string
      importJSON(content)
      alert('导入成功！')
    } catch (err) {
      alert('导入失败：文件格式错误')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function clearAll() {
  if (state.cards.length === 0) return
  if (confirm('确定要清空所有卡片和关系吗？此操作不可撤销。')) {
    state.cards = []
    state.relations = []
    clearSelection()
  }
}

function toggleTagFilter(tag: string) {
  const idx = state.filterTags.indexOf(tag)
  if (idx === -1) {
    state.filterTags.push(tag)
  } else {
    state.filterTags.splice(idx, 1)
  }
}

function getTagColor(tag: string): string {
  const cardWithTag = state.cards.find((c) => c.tag === tag && c.tagColor)
  if (cardWithTag) return cardWithTag.tagColor
  return distillTagColor(tag)
}

function clearFilters() {
  state.filterTags = []
  searchKeyword.value = ''
  state.highlightKeyword = ''
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <button class="tool-btn primary" @click="addNewCard" title="添加卡片 (双击画布也可)">
        <span class="icon">+</span>
        <span>新卡片</span>
      </button>
      <div class="divider"></div>
      <button class="tool-btn" @click="zoomIn" title="放大">
        <span class="icon">+</span>
      </button>
      <span class="zoom-value">{{ Math.round(state.viewTransform.scale * 100) }}%</span>
      <button class="tool-btn" @click="zoomOut" title="缩小">
        <span class="icon">−</span>
      </button>
      <button class="tool-btn" @click="resetView" title="重置视图">
        <span class="icon">⌂</span>
      </button>
      <div class="divider"></div>
      <button
        class="tool-btn"
        :class="{ active: state.bundleMode }"
        @click="toggleBundleMode"
        title="束线整理模式"
      >
        <span class="icon">〰</span>
        <span>束线</span>
      </button>
    </div>

    <div class="toolbar-section">
      <input
        type="text"
        v-model="searchKeyword"
        @input="handleSearchChange"
        class="search-input"
        placeholder="搜索卡片标题、摘要、标签..."
      />
    </div>

    <div class="toolbar-section" v-if="state.selectedCardIds.length > 0">
      <span class="section-label">已选 {{ state.selectedCardIds.length }} 张</span>
      <div class="divider"></div>
      <div class="align-group">
        <button class="tool-btn" @click="alignSelected('left')" title="左对齐">⟵</button>
        <button class="tool-btn" @click="alignSelected('center-h')" title="水平居中">⟷</button>
        <button class="tool-btn" @click="alignSelected('right')" title="右对齐">⟶</button>
        <button class="tool-btn" @click="alignSelected('top')" title="顶部对齐">⟰</button>
        <button class="tool-btn" @click="alignSelected('center-v')" title="垂直居中">⟺</button>
        <button class="tool-btn" @click="alignSelected('bottom')" title="底部对齐">⟱</button>
      </div>
      <div class="divider"></div>
      <div class="priority-group">
        <button
          v-for="p in [1, 2, 3, 4, 5]"
          :key="p"
          class="tool-btn priority-btn"
          @click="applyPriorityToSelected(p as 1 | 2 | 3 | 4 | 5)"
          :title="`优先级 ${p}`"
        >
          {{ '★'.repeat(p) }}
        </button>
      </div>
      <div class="divider"></div>
      <div class="tag-edit-group">
        <input
          v-model="bulkTagInput"
          type="text"
          class="tag-input-sm"
          placeholder="设置标签..."
          @keyup.enter="applyTagToSelected"
        />
        <input
          v-model="bulkTagColor"
          type="color"
          class="color-picker-sm"
          title="标签颜色"
        />
        <button class="tool-btn" @click="applyTagToSelected" :disabled="!bulkTagInput.trim()">
          应用
        </button>
      </div>
    </div>

    <div class="toolbar-section">
      <div class="tag-filter" v-if="props.allTags.length > 0">
        <span class="section-label">标签：</span>
        <button
          v-for="tag in props.allTags"
          :key="tag"
          class="tag-chip"
          :class="{ active: state.filterTags.includes(tag) }"
          :style="{ background: getTagColor(tag) + '22', borderColor: getTagColor(tag), color: getTagColor(tag) }"
          @click="toggleTagFilter(tag)"
        >
          #{{ tag }}
        </button>
        <button
          v-if="state.filterTags.length > 0 || state.highlightKeyword"
          class="tool-btn clear-btn"
          @click="clearFilters"
        >
          清除筛选
        </button>
      </div>
    </div>

    <div class="toolbar-section right">
      <div class="relation-legend">
        <div v-for="(config, type) in RELATION_CONFIG" :key="type" class="legend-item">
          <span
            class="legend-line"
            :style="{ borderColor: config.color, borderStyle: config.strokeDasharray ? 'dashed' : 'solid' }"
          ></span>
          <span>{{ config.label }}</span>
        </div>
      </div>
      <div class="divider"></div>
      <button class="tool-btn" @click="triggerImport" title="导入 JSON">
        <span>导入</span>
      </button>
      <button class="tool-btn" @click="downloadJSON" title="导出 JSON">
        <span>JSON</span>
      </button>
      <button class="tool-btn primary" @click="emit('export-png')" title="导出 PNG">
        <span>PNG</span>
      </button>
      <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="handleFileImport" />
      <div class="divider"></div>
      <button class="tool-btn danger" @click="clearAll" title="清空所有">
        <span>清空</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-section.right {
  margin-left: auto;
}

.divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #475569;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.tool-btn.primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.tool-btn.danger {
  color: #ef4444;
}

.tool-btn.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

.tool-btn.active {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.icon {
  font-size: 14px;
  font-weight: 600;
}

.zoom-value {
  font-size: 12px;
  color: #64748b;
  min-width: 40px;
  text-align: center;
}

.search-input {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  width: 240px;
  outline: none;
  transition: border-color 0.15s ease;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.section-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.align-group {
  display: flex;
  gap: 2px;
}

.align-group .tool-btn {
  padding: 6px 8px;
  font-size: 14px;
}

.priority-group {
  display: flex;
  gap: 2px;
}

.priority-btn {
  padding: 4px 8px;
  font-size: 12px;
  color: #f59e0b;
}

.tag-edit-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-input-sm {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  width: 100px;
  outline: none;
}

.tag-input-sm:focus {
  border-color: #3b82f6;
}

.color-picker-sm {
  width: 28px;
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.tag-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-chip {
  padding: 4px 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-chip:hover {
  background: #e2e8f0;
}

.tag-chip.active {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.clear-btn {
  padding: 4px 10px;
  font-size: 12px;
  color: #ef4444;
}

.relation-legend {
  display: flex;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.legend-line {
  width: 20px;
  height: 0;
  border-top-width: 2px;
  border-top-style: solid;
}
</style>

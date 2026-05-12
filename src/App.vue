<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Card, RelationType } from './types';
import { RELATION_CONFIG, DEFAULT_COLORS } from './types';
import { useStore } from './store';
import Canvas from './components/Canvas.vue';
import { exportToPNG, downloadFile } from './utils/export';

const {
  state,
  allTags,
  filteredCards,
  highlightedCards,
  createCard,
  updateCard,
  deleteCard,
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
  exportJSON
} = useStore();

const svgRef = ref<SVGSVGElement | null>(null);
const pendingRelationEnd = ref<string | null>(null);
const showRelationModal = ref(false);
const selectedColorForTag = ref<string>('');
const activeTagForColor = ref<string | null>(null);

const zoomPercent = computed(() => Math.round(state.canvas.zoom * 100) + '%');

function handleCreateCard(x: number, y: number) {
  createCard(x, y);
}

function handleUpdateCard(id: string, updates: Partial<Card>) {
  updateCard(id, updates);
}

function handleDeleteCard(id: string) {
  deleteCard(id);
}

function handleSelectCard(id: string, multi: boolean) {
  selectCard(id, multi);
}

function handleClearSelection() {
  clearSelection();
}

function handleSelectInBox(minX: number, minY: number, maxX: number, maxY: number) {
  selectCardsInBox(minX, minY, maxX, maxY);
}

function handleStartRelation(id: string) {
  startRelationCreation(id);
}

function handleEndRelation(id: string) {
  pendingRelationEnd.value = id;
  showRelationModal.value = true;
}

function handleCancelRelation() {
  cancelRelationCreation();
}

function selectRelationType(type: RelationType) {
  if (pendingRelationEnd.value) {
    finishRelationCreation(pendingRelationEnd.value, type);
  }
  showRelationModal.value = false;
  pendingRelationEnd.value = null;
}

function cancelRelationModal() {
  showRelationModal.value = false;
  pendingRelationEnd.value = null;
  cancelRelationCreation();
}

function handleDeleteRelation(id: string) {
  deleteRelation(id);
}

function handleZoom(delta: number) {
  setZoom(state.canvas.zoom + delta);
}

function handlePan(dx: number, dy: number) {
  setPan(state.canvas.panX + dx, state.canvas.panY + dy);
}

function zoomIn() {
  handleZoom(0.1);
}

function zoomOut() {
  handleZoom(-0.1);
}

function resetView() {
  setZoom(1);
  setPan(0, 0);
}

function handleTagFilterToggle(tag: string) {
  if (state.filterTags.includes(tag)) {
    setFilterTags(state.filterTags.filter(t => t !== tag));
  } else {
    setFilterTags([...state.filterTags, tag]);
  }
}

function clearTagFilter() {
  setFilterTags([]);
}

function openTagColorPicker(tag: string) {
  activeTagForColor.value = tag;
  const firstCardWithTag = state.cards.find(c => c.tags.includes(tag));
  selectedColorForTag.value = firstCardWithTag?.color || DEFAULT_COLORS[0];
}

function applyTagColor(color: string) {
  if (activeTagForColor.value) {
    batchSetColorByTag(activeTagForColor.value, color);
  }
  activeTagForColor.value = null;
}

async function handleExportPNG() {
  if (!svgRef.value) return;
  const svgElement = svgRef.value.getSvgElement();
  if (!svgElement) return;
  const dataUrl = await exportToPNG(svgElement, state.cards, state.relations);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'relation-card-wall.png';
  link.click();
}

function handleExportJSON() {
  const data = exportJSON();
  downloadFile(data, 'relation-card-wall.json', 'application/json');
}

function handleImportJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.cards) state.cards = data.cards;
        if (data.relations) state.relations = data.relations;
      } catch (err) {
        console.error('Import failed:', err);
      }
    }
  };
  input.click();
}
</script>

<template>
  <div class="app">
    <div class="toolbar">
      <button @click="() => createCard(state.canvas.panX / -state.canvas.zoom + 100, state.canvas.panY / -state.canvas.zoom + 100)">
        ➕ 新建卡片
      </button>
      <button
        :class="{ active: state.bundleMode }"
        @click="toggleBundleMode"
      >
        🧵 束线模式
      </button>
      <input
        v-model="state.searchKeyword"
        type="text"
        placeholder="🔍 搜索卡片..."
      />
      <div class="divider"></div>
      <div class="align-group" v-if="state.selectedCards.length >= 2">
        <button @click="alignSelectedCards('left')">⬅️ 左对齐</button>
        <button @click="alignSelectedCards('right')">➡️ 右对齐</button>
        <button @click="alignSelectedCards('top')">⬆️ 顶对齐</button>
        <button @click="alignSelectedCards('bottom')">⬇️ 底对齐</button>
        <button @click="alignSelectedCards('center-h')">↔️ 水平居中</button>
        <button @click="alignSelectedCards('center-v')">↕️ 垂直居中</button>
      </div>
      <div class="divider"></div>
      <button @click="handleExportPNG">📷 导出 PNG</button>
      <button @click="handleExportJSON">📄 导出 JSON</button>
      <button @click="handleImportJSON">📂 导入 JSON</button>
    </div>

    <div class="sidebar" v-if="allTags.length > 0">
      <div class="section">
        <h3>🏷️ 标签筛选</h3>
        <div
          v-for="tag in allTags"
          :key="tag"
          class="tag-item"
          :class="{ selected: state.filterTags.includes(tag) }"
          @click="handleTagFilterToggle(tag)"
          @contextmenu.prevent="openTagColorPicker(tag)"
        >
          <span
            class="tag-color"
            :style="{ background: state.cards.find(c => c.tags.includes(tag))?.color || '#666' }"
          ></span>
          <span class="tag-text">{{ tag }}</span>
        </div>
        <button
          v-if="state.filterTags.length > 0"
          class="clear-filter"
          @click="clearTagFilter"
        >
          清除筛选
        </button>
      </div>

      <div class="section" v-if="activeTagForColor">
        <h3>🎨 批量着色: {{ activeTagForColor }}</h3>
        <div class="color-picker">
          <div
            v-for="color in DEFAULT_COLORS"
            :key="color"
            class="color-option"
            :class="{ selected: selectedColorForTag === color }"
            :style="{ background: color }"
            @click="applyTagColor(color)"
          ></div>
        </div>
        <button class="clear-filter" @click="activeTagForColor = null">取消</button>
      </div>

      <div class="section">
        <h3>📊 统计</h3>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">卡片数</span>
            <span class="stat-value">{{ state.cards.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">关系数</span>
            <span class="stat-value">{{ state.relations.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">选中</span>
            <span class="stat-value">{{ state.selectedCards.length }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>💡 操作提示</h3>
        <div class="tips">
          <p>• 双击空白处创建卡片</p>
          <p>• 拖拽卡片移动位置</p>
          <p>• Shift + 拖拽框选多选</p>
          <p>• 滚轮缩放画布</p>
          <p>• 右键卡片建关系</p>
          <p>• 点击关系线删除</p>
        </div>
      </div>
    </div>

    <div class="zoom-controls">
      <button @click="zoomIn">+</button>
      <div class="zoom-level">{{ zoomPercent }}</div>
      <button @click="zoomOut">−</button>
      <button @click="resetView">⌂</button>
    </div>

    <Canvas
      ref="svgRef"
      :cards="filteredCards"
      :relations="state.relations"
      :selected-cards="state.selectedCards"
      :highlighted-cards="highlightedCards"
      :zoom="state.canvas.zoom"
      :pan-x="state.canvas.panX"
      :pan-y="state.canvas.panY"
      :bundle-mode="state.bundleMode"
      :is-creating-relation="state.isCreatingRelation"
      :relation-start="state.relationStart"
      @create-card="handleCreateCard"
      @update-card="handleUpdateCard"
      @delete-card="handleDeleteCard"
      @select-card="handleSelectCard"
      @clear-selection="handleClearSelection"
      @select-in-box="handleSelectInBox"
      @start-relation="handleStartRelation"
      @end-relation="handleEndRelation"
      @cancel-relation="handleCancelRelation"
      @delete-relation="handleDeleteRelation"
      @zoom="handleZoom"
      @pan="handlePan"
    />

    <div v-if="showRelationModal" class="relation-modal-overlay" @click="cancelRelationModal">
      <div class="relation-modal" @click.stop>
        <h3>选择关系类型</h3>
        <div class="relation-types">
          <button
            v-for="(config, type) in RELATION_CONFIG"
            :key="type"
            class="relation-type-btn"
            @click="selectRelationType(type as RelationType)"
          >
            <span class="dot" :style="{ background: config.color }"></span>
            <span class="label">{{ config.label }}</span>
          </button>
        </div>
        <button class="cancel" @click="cancelRelationModal">取消</button>
      </div>
    </div>
  </div>
</template>

<style>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
}

.align-group {
  display: flex;
  gap: 4px;
}

.clear-filter {
  margin-top: 10px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: #f3f4f6;
  cursor: pointer;
  font-size: 12px;
}

.clear-filter:hover {
  background: #e5e7eb;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  font-weight: 600;
  color: #374151;
}

.tips {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.8;
}

.tips p {
  margin: 0;
}

.relation-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1999;
}
</style>

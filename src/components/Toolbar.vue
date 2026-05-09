<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button class="btn btn-primary" @click="$emit('addCard')">+ 新建卡片</button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <label class="toolbar-label">搜索</label>
      <input class="toolbar-input" v-model="store.searchKeyword" placeholder="关键字..." />
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <label class="toolbar-label">标签筛选</label>
      <div class="tag-filter-list">
        <span
          v-for="tag in store.allTags" :key="tag"
          class="tag-filter-chip"
          :class="{ active: store.filterTags.includes(tag) }"
          @click="toggleTagFilter(tag)"
        >{{ tag }}</span>
      </div>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <label class="toolbar-label">批量着色</label>
      <select class="toolbar-select" v-model="batchTag" style="width:80px">
        <option value="">选择标签</option>
        <option v-for="tag in store.allTags" :key="tag" :value="tag">{{ tag }}</option>
      </select>
      <input type="color" v-model="batchColor" style="width:28px;height:28px;padding:1px;" />
      <button class="btn btn-sm" @click="applyBatchColor" :disabled="!batchTag">应用</button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <label class="toolbar-label">对齐</label>
      <button class="btn btn-sm" @click="store.alignSelected('left')" title="左对齐">⬅</button>
      <button class="btn btn-sm" @click="store.alignSelected('centerH')" title="水平居中">↔</button>
      <button class="btn btn-sm" @click="store.alignSelected('right')" title="右对齐">➡</button>
      <button class="btn btn-sm" @click="store.alignSelected('top')" title="顶部对齐">⬆</button>
      <button class="btn btn-sm" @click="store.alignSelected('centerV')" title="垂直居中">↕</button>
      <button class="btn btn-sm" @click="store.alignSelected('bottom')" title="底部对齐">⬇</button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="btn btn-sm" :class="{ active: store.bundleMode }" @click="store.bundleMode = !store.bundleMode">
        束线整理
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="btn btn-sm" @click="$emit('exportPNG')">导出 PNG</button>
      <button class="btn btn-sm" @click="$emit('exportJSON')">导出 JSON</button>
      <button class="btn btn-sm" @click="$emit('importJSON')">导入 JSON</button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group" v-if="store.selectedRelationId">
      <label class="toolbar-label">关系类型</label>
      <select class="toolbar-select" :value="selectedRelType" @change="onRelTypeChange">
        <option value="reference">引用</option>
        <option value="dependency">依赖</option>
        <option value="conflict">冲突</option>
      </select>
      <button class="btn btn-sm btn-danger" @click="store.removeRelation(store.selectedRelationId!)">删除关系</button>
    </div>

    <div class="toolbar-group" v-if="store.selectedCardIds.size > 0">
      <button class="btn btn-sm btn-danger" @click="store.removeSelectedCards()">删除选中</button>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group">
      <span class="toolbar-info">缩放: {{ Math.round(store.canvas.scale * 100) }}%</span>
      <button class="btn btn-sm" @click="resetView">重置视图</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCardStore } from '../stores/cardStore'
import type { RelationType } from '../types'

defineEmits<{
  addCard: []
  exportPNG: []
  exportJSON: []
  importJSON: []
}>()

const store = useCardStore()

const batchTag = ref('')
const batchColor = ref('#4A90D9')

function toggleTagFilter(tag: string) {
  const idx = store.filterTags.indexOf(tag)
  if (idx >= 0) {
    store.filterTags.splice(idx, 1)
  } else {
    store.filterTags.push(tag)
  }
}

function applyBatchColor() {
  if (batchTag.value) {
    store.batchColorByTag(batchTag.value, batchColor.value)
  }
}

const selectedRelType = computed(() => {
  const rel = store.relations.find(r => r.id === store.selectedRelationId)
  return rel?.type ?? 'reference'
})

function onRelTypeChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value as RelationType
  if (store.selectedRelationId) {
    store.changeRelationType(store.selectedRelationId, val)
  }
}

function resetView() {
  store.canvas.offsetX = 0
  store.canvas.offsetY = 0
  store.canvas.scale = 1
}
</script>

<style scoped>
.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.toolbar-label {
  color: #888;
  font-size: 11px;
  white-space: nowrap;
}
.toolbar-input {
  padding: 3px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  width: 120px;
  outline: none;
}
.toolbar-input:focus {
  border-color: #4A90D9;
}
.toolbar-select {
  padding: 3px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  flex-shrink: 0;
}
.toolbar-spacer {
  flex: 1;
}
.toolbar-info {
  color: #888;
  font-size: 11px;
}
.tag-filter-list {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.tag-filter-chip {
  padding: 1px 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  color: #666;
  background: #fff;
  transition: all 0.15s;
}
.tag-filter-chip.active {
  background: #4A90D9;
  color: #fff;
  border-color: #4A90D9;
}
.btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 12px;
  background: #fff;
  color: #333;
  transition: all 0.15s;
}
.btn:hover {
  background: #f0f0f0;
}
.btn-primary {
  background: #4A90D9;
  color: #fff;
  border-color: #4A90D9;
}
.btn-primary:hover {
  background: #3A7BC8;
}
.btn-sm {
  padding: 2px 8px;
  font-size: 11px;
}
.btn-danger {
  color: #F44336;
  border-color: #F44336;
}
.btn-danger:hover {
  background: #F44336;
  color: #fff;
}
.btn.active {
  background: #4A90D9;
  color: #fff;
  border-color: #4A90D9;
}
</style>

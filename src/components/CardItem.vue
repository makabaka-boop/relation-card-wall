<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../types'
import { TAG_COLORS } from '../types'
import { distillTagColor } from '../utils/layout'

const props = defineProps<{
  card: Card
  isSelected: boolean
  scale: number
  isHighlighted: boolean
  isFiltered: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string, additive: boolean): void
  (e: 'dragStart', id: string, event: MouseEvent): void
  (e: 'update', id: string, updates: Partial<Card>): void
  (e: 'delete', id: string): void
  (e: 'startRelation', id: string, event: MouseEvent): void
}>()

const isEditing = ref(false)
const editTitle = ref('')
const editSummary = ref('')
const editTag = ref('')
const editTagColor = ref('')

const tagColor = computed(() => {
  if (props.card.tagColor) {
    return props.card.tagColor
  }
  if (props.card.tag) {
    return distillTagColor(props.card.tag)
  }
  return '#94a3b8'
})

const priorityStars = computed(() => '★'.repeat(props.card.priority) + '☆'.repeat(5 - props.card.priority))

function handleMouseDown(e: MouseEvent) {
  if (isEditing.value) return
  if ((e.target as HTMLElement).closest('.card-action')) return
  emit('dragStart', props.card.id, e)
}

function handleClick(e: MouseEvent) {
  if (isEditing.value) return
  emit('select', props.card.id, e.shiftKey || e.metaKey || e.ctrlKey)
}

function handleDoubleClick() {
  editTitle.value = props.card.title
  editSummary.value = props.card.summary
  editTag.value = props.card.tag
  editTagColor.value = props.card.tagColor
  isEditing.value = true
}

function saveEdit() {
  emit('update', props.card.id, {
    title: editTitle.value || '未命名卡片',
    summary: editSummary.value,
    tag: editTag.value.trim(),
    tagColor: editTagColor.value,
  })
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

function startRelation(e: MouseEvent) {
  e.stopPropagation()
  emit('startRelation', props.card.id, e)
}

function deleteCard(e: MouseEvent) {
  e.stopPropagation()
  if (confirm('确定要删除这张卡片吗？')) {
    emit('delete', props.card.id)
  }
}
</script>

<template>
  <g
    class="card-wrapper"
    :transform="`translate(${card.x}, ${card.y})`"
    :style="{ opacity: isFiltered ? 0.25 : 1 }"
  >
    <rect
      :width="card.width"
      :height="card.height"
      rx="10"
      ry="10"
      :fill="isSelected ? '#eff6ff' : '#ffffff'"
      :stroke="isSelected ? '#3b82f6' : isHighlighted ? '#f59e0b' : '#e5e7eb'"
      :stroke-width="isSelected ? 2.5 : isHighlighted ? 2 : 1.5"
      class="card-bg"
      @mousedown="handleMouseDown"
      @click="handleClick"
      @dblclick="handleDoubleClick"
    />
    <rect
      x="0"
      y="0"
      :width="card.width"
      height="4"
      rx="10"
      :fill="tagColor"
    />
    <text
      v-if="!isEditing"
      :x="14"
      :y="28"
      font-size="15"
      font-weight="600"
      fill="#1f2937"
      class="card-title"
    >
      {{ card.title }}
    </text>
    <foreignObject
      v-if="!isEditing"
      :x="14"
      :y="38"
      :width="card.width - 28"
      :height="card.height - 85"
    >
      <div class="card-summary">
        {{ card.summary || '双击编辑...' }}
      </div>
    </foreignObject>
    <g v-if="!isEditing" class="card-footer">
      <text
        v-if="card.tag"
        :x="14"
        :y="card.height - 14"
        font-size="11"
        :fill="tagColor"
        font-weight="500"
      >
        #{{ card.tag }}
      </text>
      <text
        :x="card.width - 14"
        :y="card.height - 14"
        font-size="12"
        text-anchor="end"
        fill="#94a3b8"
      >
        {{ priorityStars }}
      </text>
    </g>
    <g v-if="isEditing" class="edit-mode">
      <foreignObject
        :x="10"
        :y="10"
        :width="card.width - 20"
        :height="card.height - 20"
      >
        <div class="edit-form">
          <input
            v-model="editTitle"
            type="text"
            class="edit-input"
            placeholder="标题"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
          />
          <textarea
            v-model="editSummary"
            class="edit-textarea"
            placeholder="摘要..."
            rows="2"
            @keyup.esc="cancelEdit"
          />
          <div class="tag-edit-row">
            <input
              v-model="editTag"
              type="text"
              class="edit-input tag-input"
              placeholder="标签"
            />
            <input
              v-model="editTagColor"
              type="color"
              class="color-picker"
              title="标签颜色"
            />
          </div>
          <div class="edit-actions">
            <button class="btn btn-primary" @click="saveEdit">保存</button>
            <button class="btn" @click="cancelEdit">取消</button>
          </div>
        </div>
      </foreignObject>
    </g>
    <g v-if="isSelected && !isEditing" class="card-actions">
      <g class="card-action" @click="startRelation" @mousedown.stop>
        <circle
          :cx="card.width"
          :cy="card.height / 2"
          r="10"
          fill="#10b981"
          stroke="#fff"
          stroke-width="2"
        />
        <text
          :x="card.width"
          :y="card.height / 2 + 4"
          text-anchor="middle"
          font-size="12"
          fill="#fff"
          font-weight="bold"
        >
          →
        </text>
      </g>
      <g class="card-action" @click="deleteCard">
        <circle
          :cx="card.width - 8"
          :cy="8"
          r="9"
          fill="#ef4444"
          stroke="#fff"
          stroke-width="2"
        />
        <text
          :x="card.width - 8"
          :y="11"
          text-anchor="middle"
          font-size="11"
          fill="#fff"
          font-weight="bold"
        >
          ×
        </text>
      </g>
    </g>
  </g>
</template>

<style scoped>
.card-bg {
  cursor: move;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.06));
  transition: filter 0.15s ease;
}

.card-bg:hover {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

.card-title {
  pointer-events: none;
}

.card-summary {
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
}

.edit-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  outline: none;
}

.edit-input:focus {
  border-color: #3b82f6;
}

.edit-textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 12px;
  resize: none;
  outline: none;
  flex: 1;
}

.edit-textarea:focus {
  border-color: #3b82f6;
}

.tag-edit-row {
  display: flex;
  gap: 6px;
}

.tag-input {
  flex: 1;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.edit-actions {
  display: flex;
  gap: 6px;
  margin-top: auto;
}

.btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.card-action {
  cursor: pointer;
  opacity: 0.9;
}

.card-action:hover {
  opacity: 1;
}
</style>

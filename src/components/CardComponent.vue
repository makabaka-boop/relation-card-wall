<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Card } from '../types';
import { RELATION_CONFIG } from '../types';

interface Props {
  card: Card;
  selected: boolean;
  highlighted: boolean;
  isCreatingRelation: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'select', multi: boolean): void;
  (e: 'drag-start', event: MouseEvent): void;
  (e: 'drag', event: MouseEvent): void;
  (e: 'drag-end'): void;
  (e: 'start-relation'): void;
  (e: 'end-relation'): void;
  (e: 'update', updates: Partial<Card>): void;
  (e: 'delete'): void;
}>();

const isEditing = ref(false);
const editTitle = ref('');
const editSummary = ref('');
const editTags = ref('');
const editPriority = ref(1);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const showMenu = ref(false);

const priorityStars = computed(() => '★'.repeat(props.card.priority) + '☆'.repeat(5 - props.card.priority));

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;
  event.stopPropagation();
  
  if (props.isCreatingRelation) {
    emit('end-relation');
    return;
  }
  
  emit('select', event.shiftKey);
  
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  emit('drag-start', event);
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;
  event.preventDefault();
  emit('drag', event);
}

function handleMouseUp() {
  isDragging.value = false;
  emit('drag-end');
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleDoubleClick(event: MouseEvent) {
  event.stopPropagation();
  startEditing();
}

function startEditing() {
  editTitle.value = props.card.title;
  editSummary.value = props.card.summary;
  editTags.value = props.card.tags.join(', ');
  editPriority.value = props.card.priority;
  isEditing.value = true;
}

function saveEditing() {
  const tags = editTags.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t);
  
  emit('update', {
    title: editTitle.value || '无标题',
    summary: editSummary.value,
    tags,
    priority: editPriority.value
  });
  isEditing.value = false;
}

function handleRightClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  showMenu.value = true;
}

function closeMenu() {
  showMenu.value = false;
}

function startRelation() {
  emit('start-relation');
  closeMenu();
}

function deleteCard() {
  emit('delete');
  closeMenu();
}

function setPriority(p: number) {
  emit('update', { priority: p });
  closeMenu();
}
</script>

<template>
  <g
    class="card-group"
    :style="{ cursor: isCreatingRelation ? 'pointer' : 'move' }"
    @mousedown="handleMouseDown"
    @dblclick="handleDoubleClick"
    @contextmenu="handleRightClick"
  >
    <rect
      :x="card.x"
      :y="card.y"
      :width="card.width"
      :height="card.height"
      rx="12"
      :fill="card.color + '15'"
      :stroke="selected ? '#6366F1' : highlighted ? '#F59E0B' : card.color"
      :stroke-width="selected ? 3 : highlighted ? 2.5 : 1.5"
      class="card-bg"
    />
    
    <rect
      :x="card.x"
      :y="card.y"
      :width="card.width"
      :height="6"
      rx="12"
      :fill="card.color"
      class="card-top-bar"
    />
    
    <foreignObject
      :x="card.x + 16"
      :y="card.y + 18"
      :width="card.width - 32"
      :height="card.height - 24"
    >
      <div xmlns="http://www.w3.org/1999/xhtml" class="card-content">
        <template v-if="isEditing">
          <input
            ref="titleInputRef"
            v-model="editTitle"
            class="edit-input title-input"
            placeholder="标题"
            @keyup.enter="saveEditing"
            @click.stop
          />
          <textarea
            v-model="editSummary"
            class="edit-input summary-input"
            placeholder="摘要..."
            rows="3"
            @click.stop
          />
          <input
            v-model="editTags"
            class="edit-input tags-input"
            placeholder="标签，用逗号分隔"
            @click.stop
          />
          <div class="edit-footer">
            <div class="edit-priority">
              <span
                v-for="p in 5"
                :key="p"
                class="priority-star"
                :class="{ active: p <= editPriority }"
                @click.stop="editPriority = p"
              >
                {{ p <= editPriority ? '★' : '☆' }}
              </span>
            </div>
            <button class="save-btn" @click.stop="saveEditing">
              ✓ 保存
            </button>
          </div>
        </template>
        <template v-else>
          <div class="card-title">{{ card.title }}</div>
          <div class="card-summary">{{ card.summary }}</div>
          <div class="card-footer">
            <div class="card-tags">
              <span
                v-for="tag in card.tags"
                :key="tag"
                class="tag"
                :style="{ background: card.color + '30', color: card.color }"
              >{{ tag }}</span>
            </div>
            <div class="card-priority" :style="{ color: card.color }">
              {{ priorityStars }}
            </div>
          </div>
        </template>
      </div>
    </foreignObject>
    
    <g v-if="showMenu" class="card-menu">
      <foreignObject
        :x="card.x + card.width - 10"
        :y="card.y + 40"
        width="140"
        height="180"
      >
        <div xmlns="http://www.w3.org/1999/xhtml" class="menu-container" @click.stop>
          <div class="menu-item" @click="startEditing">✏️ 编辑</div>
          <div class="menu-item" @click="startRelation">🔗 建关系</div>
          <div class="menu-item">
            <span>⭐ 优先级</span>
            <div class="priority-submenu">
              <span v-for="p in 5" :key="p" @click="setPriority(p)">
                {{ '★'.repeat(p) }}{{ '☆'.repeat(5-p) }}
              </span>
            </div>
          </div>
          <div class="menu-item delete" @click="deleteCard">🗑️ 删除</div>
          <div class="menu-cancel" @click="closeMenu">取消</div>
        </div>
      </foreignObject>
    </g>
  </g>
</template>

<style scoped>
.card-bg {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08));
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-summary {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.card-priority {
  font-size: 11px;
  letter-spacing: 1px;
}

.edit-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}

.edit-input:focus {
  border-color: #6366F1;
}

.title-input {
  font-size: 14px;
  font-weight: 600;
}

.summary-input {
  resize: none;
  flex: 1;
}

.tags-input {
  font-size: 11px;
}

.edit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.edit-priority {
  display: flex;
  gap: 2px;
}

.priority-star {
  cursor: pointer;
  font-size: 14px;
  color: #d1d5db;
  transition: color 0.2s;
}

.priority-star.active {
  color: #f59e0b;
}

.priority-star:hover {
  color: #f59e0b;
}

.save-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: #6366F1;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #4f46e5;
}

.menu-container {
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 6px;
  font-size: 13px;
}

.menu-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-item.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.priority-submenu {
  margin-left: 8px;
  display: flex;
  gap: 4px;
}

.priority-submenu span {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.priority-submenu span:hover {
  background: #fef3c7;
}

.menu-cancel {
  padding: 8px 12px;
  border-top: 1px solid #f3f4f6;
  text-align: center;
  color: #6b7280;
  cursor: pointer;
  margin-top: 4px;
}

.menu-cancel:hover {
  color: #374151;
}
</style>

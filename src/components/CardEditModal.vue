<template>
  <div class="card-edit-modal" @mousedown.stop>
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <h3>{{ isEdit ? '编辑卡片' : '新建卡片' }}</h3>
      <div class="form-group">
        <label>标题</label>
        <input v-model="form.title" placeholder="输入标题" />
      </div>
      <div class="form-group">
        <label>摘要</label>
        <textarea v-model="form.summary" placeholder="输入摘要" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <input v-model="tagsText" placeholder="标签1,标签2" />
      </div>
      <div class="form-group">
        <label>标签颜色</label>
        <input type="color" v-model="form.tagColor" />
      </div>
      <div class="form-group">
        <label>优先级</label>
        <select v-model="form.priority">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn btn-confirm" @click="onSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { CardData } from '../types'

const props = defineProps<{ card?: CardData; defaultX?: number; defaultY?: number }>()
const emit = defineEmits<{ close: []; save: [data: Partial<CardData> & { title: string }] }>()

const isEdit = ref(!!props.card)

const form = reactive({
  title: props.card?.title ?? '',
  summary: props.card?.summary ?? '',
  tagColor: props.card?.tagColor ?? '#4A90D9',
  priority: props.card?.priority ?? 'medium' as CardData['priority'],
})

const tagsText = ref(props.card?.tags?.join(',') ?? '')

watch(() => props.card, (c) => {
  if (c) {
    form.title = c.title
    form.summary = c.summary
    form.tagColor = c.tagColor
    form.priority = c.priority
    tagsText.value = c.tags.join(',')
    isEdit.value = true
  }
})

function onSave() {
  if (!form.title.trim()) return
  emit('save', {
    title: form.title.trim(),
    summary: form.summary.trim(),
    tags: tagsText.value.split(',').map(t => t.trim()).filter(Boolean),
    tagColor: form.tagColor,
    priority: form.priority,
    x: props.card?.x ?? props.defaultX ?? 100,
    y: props.card?.y ?? props.defaultY ?? 100,
    width: props.card?.width ?? 240,
    height: props.card?.height ?? 140,
  })
}
</script>

<style scoped>
.card-edit-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
}
.modal-content {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  min-width: 360px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.modal-content h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #333;
}
.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #4A90D9;
}
.form-group input[type="color"] {
  padding: 2px;
  height: 32px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.btn-cancel {
  background: #f0f0f0;
  color: #666;
}
.btn-cancel:hover {
  background: #e0e0e0;
}
.btn-confirm {
  background: #4A90D9;
  color: #fff;
}
.btn-confirm:hover {
  background: #3A7BC8;
}
</style>

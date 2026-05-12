<script setup lang="ts">
import { computed } from 'vue';
import type { Relation } from '../types';
import { RELATION_CONFIG } from '../types';

interface Props {
  relation: Relation;
  path: { x: number; y: number }[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'delete'): void;
}>();

const config = computed(() => RELATION_CONFIG[props.relation.type]);

const pathD = computed(() => {
  if (props.path.length < 2) return '';
  
  if (props.path.length === 2) {
    const [start, end] = props.path;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const cx = (start.x + end.x) / 2 + dy * 0.1;
    const cy = (start.y + end.y) / 2 - dx * 0.1;
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
  }
  
  let d = `M ${props.path[0].x} ${props.path[0].y}`;
  for (let i = 1; i < props.path.length; i++) {
    const prev = props.path[i - 1];
    const curr = props.path[i];
    const cpx = (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y}, ${cpx} ${cpy}`;
  }
  d += ` L ${props.path[props.path.length - 1].x} ${props.path[props.path.length - 1].y}`;
  return d;
});

const endPoint = computed(() => props.path[props.path.length - 1] || { x: 0, y: 0 });

const arrowRotation = computed(() => {
  if (props.path.length < 2) return 0;
  const [p1, p2] = props.path.slice(-2);
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
});

function handleClick(event: MouseEvent) {
  event.stopPropagation();
  emit('delete');
}
</script>

<template>
  <g class="relation-line" @click="handleClick" style="cursor: pointer;">
    <path
      :d="pathD"
      :stroke="config.color"
      stroke-width="2"
      fill="none"
      stroke-opacity="0.8"
      class="line-path"
    />
    <path
      :d="pathD"
      stroke="transparent"
      stroke-width="12"
      fill="none"
      class="line-hitbox"
    />
    
    <g
      :transform="`translate(${endPoint.x}, ${endPoint.y}) rotate(${arrowRotation})`"
    >
      <polygon
        v-if="config.arrowStyle === 'arrow'"
        points="-12,-6 -12,6 0,0"
        :fill="config.color"
      />
      <polygon
        v-else-if="config.arrowStyle === 'diamond'"
        points="-14,0 -7,-6 0,0 -7,6"
        :fill="config.color"
      />
      <circle
        v-else-if="config.arrowStyle === 'circle'"
        cx="-7"
        cy="0"
        r="5"
        :fill="config.color"
      />
    </g>
  </g>
</template>

<style scoped>
.line-path {
  transition: stroke-opacity 0.2s;
}

.relation-line:hover .line-path {
  stroke-opacity: 1;
  stroke-width: 3;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Canvas from './components/Canvas.vue'
import Toolbar from './components/Toolbar.vue'
import { state, allTags } from './store'
import { exportToPNG } from './utils/export'

function handleExportPNG() {
  exportToPNG(state.cards, state.relations, state.bundleMode)
}
</script>

<template>
  <div class="app">
    <Toolbar :all-tags="allTags" @export-png="handleExportPNG" />
    <div class="canvas-wrapper">
      <Canvas />
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>

<template>
  <svg class="relation-lines" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:0;">
    <defs>
      <marker id="arrow-reference" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#4A90D9" />
      </marker>
      <marker id="arrow-dependency" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#F5A623" />
      </marker>
      <marker id="arrow-conflict" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto">
        <polygon points="0 0, 12 5, 0 10" fill="#D0021B" />
        <line x1="1" y1="0" x2="1" y2="10" stroke="#D0021B" stroke-width="2" />
      </marker>
    </defs>
    <template v-if="bundleMode">
      <template v-for="group of bundledGroups" :key="group.key">
        <path
          v-for="(seg, si) of group.segments"
          :key="si"
          :d="seg.d"
          fill="none"
          :stroke="seg.color"
          :stroke-width="seg.isTrunk ? 2.5 : 1.5"
          :stroke-dasharray="seg.dashArray"
          :marker-end="seg.markerEnd"
          style="pointer-events:stroke;cursor:pointer;"
          @click.stop="store.selectedRelationId = seg.relationId; store.selectedCardIds = new Set()"
        />
      </template>
    </template>
    <template v-else>
      <path
        v-for="rel of visibleRelations"
        :key="rel.id"
        :d="getPath(rel)"
        fill="none"
        :stroke="RELATION_CONFIG[rel.type].color"
        :stroke-width="store.selectedRelationId === rel.id ? 3 : 1.5"
        :stroke-dasharray="RELATION_CONFIG[rel.type].dashArray"
        :marker-end="`url(#${RELATION_CONFIG[rel.type].markerEnd})`"
        style="pointer-events:stroke;cursor:pointer;"
        @click.stop="store.selectedRelationId = rel.id; store.selectedCardIds = new Set()"
      />
    </template>
    <line
      v-if="dragLine"
      :x1="dragLine.x1"
      :y1="dragLine.y1"
      :x2="dragLine.x2"
      :y2="dragLine.y2"
      stroke="#4A90D9"
      stroke-width="2"
      stroke-dasharray="6,3"
      style="pointer-events:none;"
    />
    <circle
      v-if="dragLine"
      :cx="dragLine.x2"
      :cy="dragLine.y2"
      r="4"
      fill="#4A90D9"
      style="pointer-events:none;"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCardStore } from '../stores/cardStore'
import { RELATION_CONFIG } from '../types'
import type { RelationData } from '../types'

const store = useCardStore()

const bundleMode = computed(() => store.bundleMode)

const dragLine = computed(() => {
  const dr = store.draggingRelation
  if (!dr) return null
  const fromCard = store.cards.find(c => c.id === dr.fromCardId)
  if (!fromCard) return null
  const fcy = fromCard.y + fromCard.height / 2
  const fromRight = Math.abs(dr.canvasX - (fromCard.x + fromCard.width)) < Math.abs(dr.canvasX - fromCard.x)
  const fx = fromRight ? fromCard.x + fromCard.width : fromCard.x
  return { x1: fx, y1: fcy, x2: dr.canvasX, y2: dr.canvasY }
})

const visibleRelations = computed(() => {
  const visible = store.visibleCardIds
  return store.relations.filter(r => visible.has(r.fromCardId) && visible.has(r.toCardId))
})

interface PathSegment {
  d: string
  color: string
  dashArray: string
  markerEnd: string
  isTrunk: boolean
  relationId: string
}

interface BundledGroup {
  key: string
  segments: PathSegment[]
}

function getCardCenter(cardId: string): { x: number; y: number } {
  const card = store.cards.find(c => c.id === cardId)
  if (!card) return { x: 0, y: 0 }
  return { x: card.x + card.width / 2, y: card.y + card.height / 2 }
}

function getCardEdge(fromId: string, toId: string): { fx: number; fy: number; tx: number; ty: number } {
  const from = store.cards.find(c => c.id === fromId)!
  const to = store.cards.find(c => c.id === toId)!
  if (!from || !to) return { fx: 0, fy: 0, tx: 0, ty: 0 }

  const fcx = from.x + from.width / 2, fcy = from.y + from.height / 2
  const tcx = to.x + to.width / 2, tcy = to.y + to.height / 2

  const fx = fcx < tcx ? from.x + from.width : from.x
  const fy = fcy
  const tx = tcx < fcx ? to.x + to.width : to.x
  const ty = tcy

  return { fx, fy, tx, ty }
}

function getPath(rel: RelationData): string {
  const { fx, fy, tx, ty } = getCardEdge(rel.fromCardId, rel.toCardId)
  const dx = tx - fx
  const cpOffset = Math.abs(dx) * 0.4 + 30
  const cpx1 = fx + (dx > 0 ? cpOffset : -cpOffset)
  const cpx2 = tx - (dx > 0 ? cpOffset : -cpOffset)
  return `M${fx},${fy} C${cpx1},${fy} ${cpx2},${ty} ${tx},${ty}`
}

const bundledGroups = computed<BundledGroup[]>(() => {
  const rels = visibleRelations.value
  if (!bundleMode.value || rels.length === 0) return []

  const fromGroups = new Map<string, RelationData[]>()
  rels.forEach(r => {
    const list = fromGroups.get(r.fromCardId) ?? []
    list.push(r)
    fromGroups.set(r.fromCardId, list)
  })

  const groups: BundledGroup[] = []

  fromGroups.forEach((groupRels, fromId) => {
    if (groupRels.length === 0) return
    const fromCenter = getCardCenter(fromId)
    const sorted = [...groupRels].sort((a, b) => {
      const ac = getCardCenter(a.toCardId)
      const bc = getCardCenter(b.toCardId)
      return Math.atan2(ac.y - fromCenter.y, ac.x - fromCenter.x) - Math.atan2(bc.y - fromCenter.y, bc.x - fromCenter.x)
    })

    const trunkLen = 60
    const allSameType = sorted.every(r => r.type === sorted[0].type)
    const trunkType = sorted[0].type
    const trunkConfig = RELATION_CONFIG[trunkType]

    const segments: PathSegment[] = []

    if (sorted.length >= 2) {
      const angles = sorted.map(r => {
        const tc = getCardCenter(r.toCardId)
        return Math.atan2(tc.y - fromCenter.y, tc.x - fromCenter.x)
      })
      const avgAngle = angles.reduce((s, a) => s + a, 0) / angles.length

      const trunkEndX = fromCenter.x + Math.cos(avgAngle) * trunkLen
      const trunkEndY = fromCenter.y + Math.sin(avgAngle) * trunkLen

      if (allSameType) {
        segments.push({
          d: `M${fromCenter.x},${fromCenter.y} L${trunkEndX},${trunkEndY}`,
          color: trunkConfig.color,
          dashArray: trunkConfig.dashArray,
          markerEnd: '',
          isTrunk: true,
          relationId: '',
        })
      }

      sorted.forEach((rel) => {
        const { fx, fy, tx, ty } = getCardEdge(rel.fromCardId, rel.toCardId)
        const config = RELATION_CONFIG[rel.type]
        const dx = tx - trunkEndX
        const cpOffset = Math.abs(dx) * 0.3 + 20
        const cpx1 = trunkEndX + (dx > 0 ? cpOffset : -cpOffset)
        const cpx2 = tx - (dx > 0 ? cpOffset : -cpOffset)

        if (allSameType) {
          segments.push({
            d: `M${trunkEndX},${trunkEndY} C${cpx1},${trunkEndY} ${cpx2},${ty} ${tx},${ty}`,
            color: config.color,
            dashArray: config.dashArray,
            markerEnd: `url(#${config.markerEnd})`,
            isTrunk: false,
            relationId: rel.id,
          })
        } else {
          segments.push({
            d: `M${fx},${fy} C${cpx1},${fy} ${cpx2},${ty} ${tx},${ty}`,
            color: config.color,
            dashArray: config.dashArray,
            markerEnd: `url(#${config.markerEnd})`,
            isTrunk: false,
            relationId: rel.id,
          })
        }
      })
    } else {
      const rel = sorted[0]
      const config = RELATION_CONFIG[rel.type]
      const { fx, fy, tx, ty } = getCardEdge(rel.fromCardId, rel.toCardId)
      const dx = tx - fx
      const cpOffset = Math.abs(dx) * 0.4 + 30
      const cpx1 = fx + (dx > 0 ? cpOffset : -cpOffset)
      const cpx2 = tx - (dx > 0 ? cpOffset : -cpOffset)
      segments.push({
        d: `M${fx},${fy} C${cpx1},${fy} ${cpx2},${ty} ${tx},${ty}`,
        color: config.color,
        dashArray: config.dashArray,
        markerEnd: `url(#${config.markerEnd})`,
        isTrunk: false,
        relationId: rel.id,
      })
    }

    groups.push({ key: fromId, segments })
  })

  return groups
})
</script>

<template>
  <div class="map-wrapper" :class="{ 'map-dim': isDim, 'map-add-mode': addMode }">
    <svg
      ref="svgEl"
      class="world-map"
      :class="{ 'cursor-crosshair': addMode }"
      viewBox="0 0 900 550"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      @click="handleMapClick"
    >
      <defs>
        <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6ab0d8" />
          <stop offset="100%" stop-color="#3d8bb5" />
        </linearGradient>
        <linearGradient id="landGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6b9c5a" />
          <stop offset="100%" stop-color="#4a7c3e" />
        </linearGradient>
        <radialGradient id="rippleGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffd700" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ffd700" stop-opacity="0" />
        </radialGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
        </filter>
        <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff8dc" />
          <stop offset="30%" stop-color="#ffd700" />
          <stop offset="70%" stop-color="#daa520" />
          <stop offset="100%" stop-color="#8b6914" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="900" height="550" fill="url(#oceanGrad)" />

      <g class="grid-lines">
        <line v-for="i in 8" :key="'h'+i" :x1="0" :y1="i*60" :x2="900" :y2="i*60" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1" />
        <line v-for="i in 12" :key="'v'+i" :x1="i*75" :y1="0" :x2="i*75" :y2="550" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1" />
      </g>

      <g class="continents">
        <path
          v-for="c in continents"
          :key="c.id"
          :d="c.path"
          :fill="c.fill"
          stroke="#2d4a2b"
          stroke-width="1.5"
          filter="url(#shadow)"
          class="continent"
        />
      </g>

      <g class="markers" @click.stop>
        <template v-for="place in places" :key="place.id">
          <WishFlag
            v-if="place.status === 'wish'"
            :x="place.x"
            :y="place.y"
            :name="place.name"
            @check-in="emit('checkIn', place.id)"
          />
          <TrophyMarker
            v-else
            :x="place.x"
            :y="place.y"
            :name="place.name"
            :date="place.lastVisit"
            @undo="emit('undo', place.id)"
          />
        </template>
      </g>

      <g v-if="addMode && hoverPos" class="crosshair">
        <line :x1="hoverPos.x - 15" :y1="hoverPos.y" :x2="hoverPos.x - 5" :y2="hoverPos.y" stroke="#ffd700" stroke-width="2" />
        <line :x1="hoverPos.x + 5" :y1="hoverPos.y" :x2="hoverPos.x + 15" :y2="hoverPos.y" stroke="#ffd700" stroke-width="2" />
        <line :x1="hoverPos.x" :y1="hoverPos.y - 15" :x2="hoverPos.x" :y2="hoverPos.y - 5" stroke="#ffd700" stroke-width="2" />
        <line :x1="hoverPos.x" :y1="hoverPos.y + 5" :x2="hoverPos.x" :y2="hoverPos.y + 15" stroke="#ffd700" stroke-width="2" />
        <circle :cx="hoverPos.x" :cy="hoverPos.y" r="6" fill="none" stroke="#ffd700" stroke-width="2" stroke-dasharray="4 3">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" :dur="'4s'" repeatCount="indefinite" />
        </circle>
      </g>

      <g v-if="addMode" class="add-hint">
        <rect x="370" y="10" width="160" height="28" rx="14" fill="#ffd700" fill-opacity="0.15" stroke="#ffd700" stroke-width="1" />
        <text x="450" y="29" text-anchor="middle" font-size="12" fill="#ffd700" font-weight="600">点击地图任意位置选点</text>
      </g>

      <RainOverlay v-if="isDim" />
    </svg>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { continents } from '../data/mapData.js'
import WishFlag from './WishFlag.vue'
import TrophyMarker from './TrophyMarker.vue'
import RainOverlay from './RainOverlay.vue'

const props = defineProps({
  places: { type: Array, required: true },
  isDim: { type: Boolean, default: false },
  addMode: { type: Boolean, default: false }
})

const emit = defineEmits(['checkIn', 'undo', 'pickLocation'])

const svgEl = ref(null)
const hoverPos = ref(null)

function handleMapClick(event) {
  if (!props.addMode) return
  if (!svgEl.value) return

  const rect = svgEl.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top

  const scaleX = 900 / rect.width
  const scaleY = 550 / rect.height

  const viewBoxX = Math.round(clickX * scaleX)
  const viewBoxY = Math.round(clickY * scaleY)

  const clampedX = Math.max(15, Math.min(885, viewBoxX))
  const clampedY = Math.max(40, Math.min(530, viewBoxY))

  emit('pickLocation', { x: clampedX, y: clampedY })
}

function handleMouseMove(event) {
  if (!props.addMode || !svgEl.value) return
  const rect = svgEl.value.getBoundingClientRect()
  const scaleX = 900 / rect.width
  const scaleY = 550 / rect.height
  const x = Math.round((event.clientX - rect.left) * scaleX)
  const y = Math.round((event.clientY - rect.top) * scaleY)
  hoverPos.value = { x: Math.max(15, Math.min(885, x)), y: Math.max(40, Math.min(530, y)) }
}

function handleMouseLeave() {
  hoverPos.value = null
}

if (svgEl.value) {
  svgEl.value.addEventListener('mousemove', handleMouseMove)
  svgEl.value.addEventListener('mouseleave', handleMouseLeave)
}

import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  if (svgEl.value) {
    svgEl.value.addEventListener('mousemove', handleMouseMove)
    svgEl.value.addEventListener('mouseleave', handleMouseLeave)
  }
})

onUnmounted(() => {
  if (svgEl.value) {
    svgEl.value.removeEventListener('mousemove', handleMouseMove)
    svgEl.value.removeEventListener('mouseleave', handleMouseLeave)
  }
})
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transition: filter 1.5s ease;
  background: #3d8bb5;
  position: relative;
}

.map-dim {
  filter: brightness(0.55) saturate(0.7) contrast(1.1);
}

.map-add-mode {
  outline: 2px dashed #ffd700;
  outline-offset: -4px;
}

.world-map {
  width: 100%;
  height: 100%;
  display: block;
}

.cursor-crosshair {
  cursor: crosshair;
}

.continent {
  transition: fill 0.3s ease;
}

.continent:hover {
  filter: brightness(1.1);
}

.crosshair {
  pointer-events: none;
}

.add-hint rect {
  animation: hint-pulse 2s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { fill-opacity: 0.15; }
  50% { fill-opacity: 0.4; }
}

.add-hint text {
  animation: hint-text 2s ease-in-out infinite;
}

@keyframes hint-text {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}
</style>

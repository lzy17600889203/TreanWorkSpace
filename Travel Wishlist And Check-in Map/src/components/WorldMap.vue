<template>
  <div class="map-wrapper" :class="{ 'map-dim': isDim }">
    <svg
      class="world-map"
      viewBox="0 0 900 550"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
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

      <g class="markers">
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

      <RainOverlay v-if="isDim" />
    </svg>
  </div>
</template>

<script setup>
import { continents } from '../data/mapData.js'
import WishFlag from './WishFlag.vue'
import TrophyMarker from './TrophyMarker.vue'
import RainOverlay from './RainOverlay.vue'

defineProps({
  places: { type: Array, required: true },
  isDim: { type: Boolean, default: false }
})

const emit = defineEmits(['checkIn', 'undo'])
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
}

.map-dim {
  filter: brightness(0.55) saturate(0.7) contrast(1.1);
}

.world-map {
  width: 100%;
  height: 100%;
  display: block;
}

.continent {
  transition: fill 0.3s ease;
}

.continent:hover {
  filter: brightness(1.1);
}
</style>

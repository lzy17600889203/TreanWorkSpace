<template>
  <g
    class="trophy-marker"
    :transform="`translate(${x}, ${y})`"
    v-if="mounted"
  >
    <circle
      v-for="(r, i) in ripples"
      :key="i"
      cx="0"
      cy="0"
      :r="r.r"
      fill="none"
      stroke="#ffd700"
      :stroke-width="r.w"
      :opacity="r.op"
      :style="{ animation: `ripple-expand ${rippleDuration}s ease-out ${i * 0.4}s 1 forwards` }"
    />

    <circle cx="0" cy="0" r="4" fill="#b8860b" />

    <g class="trophy-group" :class="{ 'trophy-anim': animate }">
      <path
        class="trophy-base"
        d="M-8,2 L8,2 L7,-2 L-7,-2 Z"
        fill="#8b6914"
      />
      <path
        class="trophy-stem"
        d="M-3,-2 L3,-2 L3,-8 L-3,-8 Z"
        fill="#b8860b"
      />
      <path
        class="trophy-cup"
        :d="cupPath"
        fill="url(#trophyGrad)"
        stroke="#8b6914"
        stroke-width="1"
      />
      <path
        class="trophy-handle-left"
        d="M-12,-18 Q-18,-16 -17,-10 Q-16,-6 -12,-8"
        fill="none"
        stroke="#ffd700"
        stroke-width="2.5"
      />
      <path
        class="trophy-handle-right"
        d="M12,-18 Q18,-16 17,-10 Q16,-6 12,-8"
        fill="none"
        stroke="#ffd700"
        stroke-width="2.5"
      />
      <ellipse cx="0" cy="-22" rx="6" ry="2" fill="#fff8dc" opacity="0.6" />
      <path d="M-4,-15 L-2,-12 L0,-15 L2,-12 L4,-15" fill="none" stroke="#8b6914" stroke-width="0.8" />
    </g>

    <g class="sparkles">
      <text v-for="s in sparkles" :key="s.id" :x="s.x" :y="s.y" :style="{ animation: `sparkle 1.5s ease-in-out ${s.delay}s infinite` }" font-size="10" fill="#fff8dc">✦</text>
    </g>

    <g class="info-tooltip">
      <rect :x="-tooltipW/2" y="-52" :width="tooltipW" height="18" rx="4" fill="#222" fill-opacity="0.9" />
      <text x="0" y="-39" text-anchor="middle" font-size="10" fill="#ffd700">🏆 {{ name }}</text>
    </g>
  </g>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  name: { type: String, default: '' },
  date: { type: [String, Date], default: null }
})

const mounted = ref(false)
const animate = ref(true)
const rippleDuration = 1.6

onMounted(() => {
  setTimeout(() => {
    mounted.value = true
  }, 50)
  setTimeout(() => {
    animate.value = false
  }, 1200)
})

const tooltipW = computed(() => Math.max(60, props.name.length * 14 + 30))

const cupPath = computed(() => {
  return 'M-10,-8 L10,-8 L11,-22 Q10,-28 0,-30 Q-10,-28 -11,-22 Z'
})

const ripples = [
  { r: 6, w: 3, op: 0.8 },
  { r: 6, w: 2.5, op: 0.6 },
  { r: 6, w: 2, op: 0.4 },
  { r: 6, w: 1.5, op: 0.2 }
]

const sparkles = [
  { id: 1, x: -18, y: -28, delay: '0s' },
  { id: 2, x: 18, y: -30, delay: '0.5s' },
  { id: 3, x: 10, y: -38, delay: '1s' },
  { id: 4, x: -10, y: -36, delay: '1.5s' }
]
</script>

<style scoped>
.trophy-marker {
  cursor: pointer;
}

.trophy-group {
  transform-origin: 0 0;
  filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));
}

.trophy-anim {
  animation: trophy-drop 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s 1;
}

@keyframes trophy-drop {
  0% {
    transform: translateY(-400px) rotate(-10deg);
    opacity: 0;
  }
  60% {
    transform: translateY(20px) rotate(3deg);
    opacity: 1;
  }
  80% {
    transform: translateY(-8px) rotate(-1deg);
  }
  100% {
    transform: translateY(0) rotate(0);
  }
}

.trophy-cup {
  animation: trophy-shine 3s ease-in-out infinite;
}

@keyframes trophy-shine {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.2); }
}

.sparkles text {
  opacity: 0;
}

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
}

.info-tooltip rect {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.info-tooltip text {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.trophy-marker:hover .info-tooltip rect,
.trophy-marker:hover .info-tooltip text {
  opacity: 0.95;
}
</style>

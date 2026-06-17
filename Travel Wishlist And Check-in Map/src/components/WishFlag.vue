<template>
  <g
    class="wish-flag"
    :transform="`translate(${x}, ${y})`"
    @click.stop="handleClick"
  >
    <line x1="0" y1="0" x2="0" y2="-35" stroke="#5a3d2b" stroke-width="2" stroke-linecap="round" />
    <circle cx="0" cy="0" r="3" fill="#5a3d2b" />

    <g class="flag-group">
      <path
        class="flag-body"
        :d="flagPath"
        fill="#e63946"
        stroke="#b01a28"
        stroke-width="1"
      />
      <path class="flag-shine" :d="shinePath" fill="#ffffff" fill-opacity="0.25" />
    </g>

    <g class="check-btn" @click.stop="handleCheckIn">
      <circle cx="0" cy="-48" r="12" fill="#ffffff" stroke="#e63946" stroke-width="2" />
      <text x="0" y="-44" text-anchor="middle" font-size="14" fill="#e63946" font-weight="bold">✓</text>
    </g>

    <g class="tooltip">
      <rect x="-35" y="-78" width="70" height="20" rx="4" fill="#222" fill-opacity="0.9" />
      <text x="0" y="-64" text-anchor="middle" font-size="11" fill="#ffd700">攒钱中...</text>
      <text x="0" y="-54" text-anchor="middle" font-size="10" fill="#fff">{{ name }}</text>
    </g>
  </g>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  name: { type: String, default: '' }
})

const emit = defineEmits(['check-in'])

const wavePhase = ref(0)
const animFrame = ref(null)

const flagPath = computed(() => {
  const p = wavePhase.value
  const w = 22
  const h = 14
  const w1 = w + Math.sin(p) * 2
  const w2 = w + Math.sin(p + 1.5) * 2
  const w3 = w + Math.sin(p + 3) * 2
  return `M0,-35 Q${w1 / 2},-${35 + Math.sin(p) * 2} ${w1},-${35 + Math.sin(p + 0.8) * 1.5} Q${w2 + 2},-${35 + h / 2 + Math.sin(p + 1.5) * 2} ${w3},-${35 + h + Math.sin(p + 2.3) * 1.5} Q${w1 / 2},-${35 + h + Math.sin(p + 3) * 2} 0,-${35 + h} Z`
})

const shinePath = computed(() => {
  const p = wavePhase.value
  return `M3,-33 Q${8 + Math.sin(p) * 1.5},-${33 + Math.sin(p) * 1} ${10 + Math.sin(p) * 2},-${30 + Math.sin(p + 1) * 1} Q${8 + Math.sin(p + 0.5) * 1.5},-${29 + Math.sin(p + 1.5) * 1} 3,-32 Z`
})

onMounted(() => {
  let t = 0
  const animate = () => {
    t += 0.08
    wavePhase.value = t
    animFrame.value = requestAnimationFrame(animate)
  }
  animate()
})

onUnmounted(() => {
  if (animFrame.value) {
    cancelAnimationFrame(animFrame.value)
  }
})

function handleCheckIn() {
  emit('check-in')
}

function handleClick() {
  emit('check-in')
}
</script>

<style scoped>
.wish-flag {
  cursor: pointer;
}

.flag-group {
  transform-origin: 0 -35px;
  animation: flag-sway 4s ease-in-out infinite;
}

@keyframes flag-sway {
  0%, 100% { transform: rotate(-1deg); }
  50% { transform: rotate(3deg); }
}

.flag-body {
  filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
}

.check-btn circle {
  transition: all 0.2s ease;
}

.wish-flag:hover .check-btn circle {
  r: 14;
  fill: #e63946;
  stroke: #fff;
}

.wish-flag:hover .check-btn text {
  fill: #fff;
}

.wish-flag:hover .tooltip {
  opacity: 1;
  transform: translateY(0);
}

.tooltip {
  opacity: 0;
  transform: translateY(5px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  pointer-events: none;
}
</style>

<template>
  <g class="rain-overlay">
    <g v-for="drop in drops" :key="drop.id" class="raindrop" :style="{ animation: `raindrop ${drop.duration}s linear ${drop.delay}s infinite` }">
      <line
        :x1="drop.x"
        :y1="drop.startY"
        :x2="drop.x + drop.skew"
        :y2="drop.startY + drop.length"
        stroke="#a8d4f0"
        :stroke-width="drop.width"
        :stroke-opacity="drop.opacity"
        stroke-linecap="round"
      />
    </g>

    <g class="splash">
      <ellipse
        v-for="s in splashes"
        :key="s.id"
        :cx="s.x"
        :cy="s.y"
        :rx="s.rx"
        :ry="s.ry"
        fill="none"
        stroke="#c9e4f5"
        stroke-opacity="0.5"
        stroke-width="0.8"
        :style="{ animation: `splash-ring ${s.duration}s ease-out ${s.delay}s infinite` }"
      />
    </g>

    <g class="rain-clouds">
      <ellipse cx="100" cy="20" rx="60" ry="12" fill="#4a5568" opacity="0.4" />
      <ellipse cx="280" cy="15" rx="70" ry="14" fill="#4a5568" opacity="0.5" />
      <ellipse cx="500" cy="18" rx="55" ry="11" fill="#4a5568" opacity="0.35" />
      <ellipse cx="700" cy="22" rx="65" ry="13" fill="#4a5568" opacity="0.45" />
      <ellipse cx="850" cy="15" rx="50" ry="10" fill="#4a5568" opacity="0.4" />
    </g>
  </g>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const drops = ref([])
const splashes = ref([])

onMounted(() => {
  const d = []
  for (let i = 0; i < 80; i++) {
    d.push({
      id: i,
      x: Math.random() * 900,
      startY: -50 - Math.random() * 400,
      length: 15 + Math.random() * 20,
      width: 0.8 + Math.random() * 1.2,
      skew: 8 + Math.random() * 8,
      opacity: 0.4 + Math.random() * 0.4,
      duration: 0.6 + Math.random() * 0.8,
      delay: (Math.random() * 2).toFixed(2) + 's'
    })
  }
  drops.value = d

  const s = []
  for (let i = 0; i < 25; i++) {
    s.push({
      id: i,
      x: Math.random() * 900,
      y: 300 + Math.random() * 240,
      rx: 3,
      ry: 1,
      duration: 0.8 + Math.random() * 0.6,
      delay: (Math.random() * 3).toFixed(2) + 's'
    })
  }
  splashes.value = s
})
</script>

<style scoped>
.rain-overlay {
  pointer-events: none;
}

.raindrop {
  opacity: 0;
}

@keyframes raindrop {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: translateY(600px);
    opacity: 0.3;
  }
}

@keyframes splash-ring {
  0% {
    rx: 3;
    ry: 1;
    stroke-opacity: 0.6;
  }
  100% {
    rx: 12;
    ry: 3;
    stroke-opacity: 0;
  }
}

.rain-clouds ellipse {
  animation: cloud-drift 20s ease-in-out infinite alternate;
}

@keyframes cloud-drift {
  0% { transform: translateX(0); }
  100% { transform: translateX(20px); }
}
</style>

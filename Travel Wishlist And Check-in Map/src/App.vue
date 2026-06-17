<template>
  <div class="map-container">
    <header class="app-header">
      <h1 class="app-title">✈ 我的旅行打卡地图 ✈</h1>
      <p class="app-subtitle">在想去的地方插旗，走过的地方留下金色奖杯</p>
    </header>

    <div v-if="isStale" class="warning-banner">
      🌧 已经 {{ monthsSinceLastVisit }} 个月没去新地方啦，世界地图正在下雨...
    </div>

    <div class="map-area">
      <div class="map-main">
        <WorldMap
          :places="places"
          :is-dim="isStale"
          @check-in="handleCheckIn"
          @undo="handleUndo"
        />
      </div>

      <aside class="map-sidebar">
        <h2 class="sidebar-title">📍 我的旅行清单</h2>

        <div class="place-list">
          <div
            v-for="p in places"
            :key="p.id"
            class="place-item"
            :class="p.status"
            @click="togglePlace(p.id)"
          >
            <div class="place-info">
              <span class="place-name">{{ p.name }}</span>
              <span class="place-status">
                {{ p.status === 'wish' ? '💭 攒钱中' : '🏆 已去过' }}
                {{ p.lastVisit ? ` · ${formatDate(p.lastVisit)}` : '' }}
              </span>
            </div>
            <span
              class="place-action"
              :class="p.status === 'wish' ? 'check' : 'trophy'"
            >
              {{ p.status === 'wish' ? '✓' : '🏆' }}
            </span>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat">
            <div class="stat-value">{{ wishCount }}</div>
            <div class="stat-label">心愿</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ visitedCount }}</div>
            <div class="stat-label">已打卡</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ progressPercent }}%</div>
            <div class="stat-label">进度</div>
          </div>
        </div>

        <div class="controls">
          <button class="btn btn-primary" @click="simulateStale">
            {{ isStale ? '☀ 唤醒地图' : '🌧 体验下雨' }}
          </button>
          <button class="btn btn-ghost" @click="resetAll">重置</button>
        </div>

        <div class="legend">
          <div class="legend-item"><span class="legend-icon">🚩</span> 红旗 = 想去的地方（悬停查看）</div>
          <div class="legend-item"><span class="legend-icon">🏆</span> 奖杯 = 已打卡 + 飞机音效</div>
          <div class="legend-item"><span class="legend-icon">🌧</span> 3个月未打卡 → 开始下雨</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import WorldMap from './components/WorldMap.vue'
import { defaultPlaces } from './data/mapData.js'
import { playAirplaneTakeoff, playClickSound } from './utils/audio.js'

const STORAGE_KEY = 'travel-places-v1'
const STALE_MONTHS = 3

const places = ref([])
const simulateStaleFlag = ref(false)

function loadPlaces() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      places.value = JSON.parse(saved)
    } else {
      places.value = JSON.parse(JSON.stringify(defaultPlaces))
    }
  } catch (e) {
    places.value = JSON.parse(JSON.stringify(defaultPlaces))
  }
}

function savePlaces() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places.value))
  } catch (e) {}
}

onMounted(() => {
  loadPlaces()
})

const wishCount = computed(() => places.value.filter(p => p.status === 'wish').length)
const visitedCount = computed(() => places.value.filter(p => p.status === 'visited').length)
const progressPercent = computed(() => {
  if (!places.value.length) return 0
  return Math.round((visitedCount.value / places.value.length) * 100)
})

const lastVisitTime = computed(() => {
  const visits = places.value
    .filter(p => p.lastVisit)
    .map(p => new Date(p.lastVisit).getTime())
  if (!visits.length) return null
  return Math.max(...visits)
})

const monthsSinceLastVisit = computed(() => {
  const last = lastVisitTime.value
  if (!last) return STALE_MONTHS
  const now = Date.now()
  const diffMs = now - last
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
})

const isStale = computed(() => {
  if (simulateStaleFlag.value) return true
  const last = lastVisitTime.value
  if (!last) return true
  const now = Date.now()
  const diffMs = now - last
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)) >= STALE_MONTHS
})

function handleCheckIn(id) {
  const target = places.value.find(p => p.id === id)
  if (!target || target.status === 'visited') return

  playAirplaneTakeoff()

  target.status = 'visited'
  target.lastVisit = new Date().toISOString()
  savePlaces()
}

function handleUndo(id) {
  playClickSound()
  const target = places.value.find(p => p.id === id)
  if (target) {
    target.status = 'wish'
    target.lastVisit = null
    savePlaces()
  }
}

function togglePlace(id) {
  const p = places.value.find(x => x.id === id)
  if (!p) return
  if (p.status === 'wish') {
    handleCheckIn(id)
  } else {
    handleUndo(id)
  }
}

function simulateStale() {
  simulateStaleFlag.value = !simulateStaleFlag.value
  playClickSound()
}

function resetAll() {
  places.value = JSON.parse(JSON.stringify(defaultPlaces))
  simulateStaleFlag.value = false
  savePlaces()
  playClickSound()
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
  } catch (e) {
    return ''
  }
}
</script>

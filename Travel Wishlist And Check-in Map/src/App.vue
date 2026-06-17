<template>
  <div class="map-container">
    <header class="app-header">
      <h1 class="app-title">✈ 我的旅行打卡地图 ✈</h1>
      <p class="app-subtitle">在想去的地方插旗，走过的地方留下金色奖杯</p>
    </header>

    <div v-if="isStale" class="warning-banner">
      🌧 已经 {{ monthsSinceLastVisit }} 个月没去新地方啦，世界地图正在下雨...
    </div>

    <div v-if="addMode" class="warning-banner add-banner">
      🎯 添加模式：点击地图选位置 → 输入地点名称
      <button class="btn btn-ghost btn-small" @click="cancelAdd">取消</button>
    </div>

    <div class="map-area">
      <div class="map-main">
        <WorldMap
          :places="places"
          :is-dim="isStale"
          :add-mode="addMode"
          @check-in="handleCheckIn"
          @undo="handleUndo"
          @pick-location="handlePickLocation"
        />
      </div>

      <aside class="map-sidebar">
        <h2 class="sidebar-title">📍 我的旅行清单</h2>

        <button class="btn btn-primary btn-add" @click="startAddMode">
          ➕ 添加新地点
        </button>

        <div v-if="pendingLocation && !showNameForm" class="pending-panel">
          <div class="pending-title">已选位置 ({{ pendingLocation.x }}, {{ pendingLocation.y }})</div>
          <div class="pending-actions">
            <button class="btn btn-ghost btn-small" @click="pendingLocation = null">重选</button>
            <button class="btn btn-primary btn-small" @click="showNameForm = true">命名 →</button>
          </div>
        </div>

        <div v-if="showNameForm" class="name-form">
          <div class="form-title">给这个地方起个名字：</div>
          <input
            v-model="newPlaceName"
            type="text"
            class="name-input"
            placeholder="例如：冰岛、拉萨、大阪..."
            maxlength="15"
            @keyup.enter="confirmAdd"
            @keyup.esc="cancelAdd"
            autofocus
          />
          <div class="form-hint">Enter 确认 · Esc 取消</div>
          <div class="pending-actions">
            <button class="btn btn-ghost btn-small" @click="cancelAdd">取消</button>
            <button class="btn btn-primary btn-small" @click="confirmAdd" :disabled="!newPlaceName.trim()">
              添加 🚩
            </button>
          </div>
        </div>

        <div class="place-list">
          <div
            v-for="p in places"
            :key="p.id"
            class="place-item"
            :class="p.status"
          >
            <div class="place-info" @click="togglePlace(p.id)">
              <span class="place-name">{{ p.name }}</span>
              <span class="place-status">
                {{ p.status === 'wish' ? '💭 攒钱中' : '🏆 已去过' }}
                {{ p.lastVisit ? ` · ${formatDate(p.lastVisit)}` : '' }}
              </span>
            </div>
            <div class="place-actions">
              <span
                class="place-action"
                :class="p.status === 'wish' ? 'check' : 'trophy'"
                @click="togglePlace(p.id)"
              >
                {{ p.status === 'wish' ? '✓' : '🏆' }}
              </span>
              <button class="delete-btn" @click="deletePlace(p.id)" title="删除">
                ✕
              </button>
            </div>
          </div>
          <div v-if="places.length === 0" class="empty-state">
            还没有地点，点击上方「添加新地点」开始吧！
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
          <button class="btn btn-ghost" @click="simulateStale">
            {{ isStale ? '☀ 唤醒地图' : '🌧 体验下雨' }}
          </button>
          <button class="btn btn-ghost" @click="resetAll">重置</button>
        </div>

        <div class="legend">
          <div class="legend-item"><span class="legend-icon">🚩</span> 红旗 = 想去的地方（悬停查看）</div>
          <div class="legend-item"><span class="legend-icon">🏆</span> 奖杯 = 已打卡 + 飞机音效</div>
          <div class="legend-item"><span class="legend-icon">✕</span> 删除按钮 = 从列表移除</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import WorldMap from './components/WorldMap.vue'
import { defaultPlaces } from './data/mapData.js'
import { playAirplaneTakeoff, playClickSound } from './utils/audio.js'

const STORAGE_KEY = 'travel-places-v2'
const STALE_MONTHS = 3

const places = ref([])
const simulateStaleFlag = ref(false)
const addMode = ref(false)
const pendingLocation = ref(null)
const showNameForm = ref(false)
const newPlaceName = ref('')

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
  if (confirm('确定要重置为默认 8 个城市吗？您自定义的地点将被清空。')) {
    places.value = JSON.parse(JSON.stringify(defaultPlaces))
    simulateStaleFlag.value = false
    cancelAdd()
    savePlaces()
    playClickSound()
  }
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
  } catch (e) {
    return ''
  }
}

function startAddMode() {
  addMode.value = true
  pendingLocation.value = null
  showNameForm.value = false
  newPlaceName.value = ''
  playClickSound()
}

function handlePickLocation(pos) {
  pendingLocation.value = pos
  showNameForm.value = true
  playClickSound()
  nextTick(() => {
    const input = document.querySelector('.name-input')
    if (input) input.focus()
  })
}

function confirmAdd() {
  if (!pendingLocation.value || !newPlaceName.value.trim()) return

  const newPlace = {
    id: 'u_' + Date.now().toString(36),
    name: newPlaceName.value.trim(),
    x: pendingLocation.value.x,
    y: pendingLocation.value.y,
    status: 'wish',
    lastVisit: null
  }

  places.value.push(newPlace)
  playClickSound()
  savePlaces()
  cancelAdd()
}

function cancelAdd() {
  addMode.value = false
  pendingLocation.value = null
  showNameForm.value = false
  newPlaceName.value = ''
}

function deletePlace(id) {
  const p = places.value.find(x => x.id === id)
  if (!p) return
  if (confirm(`确定要删除「${p.name}」吗？`)) {
    places.value = places.value.filter(x => x.id !== id)
    playClickSound()
    savePlaces()
  }
}
</script>

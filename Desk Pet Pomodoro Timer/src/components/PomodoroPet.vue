<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { PetEngine, type PetState } from '../pet/PetEngine'

// ============== 配置与持久化 ==============
const STORAGE_KEY = 'pet-pomodoro-settings'

interface Settings {
  focusMinutes: number
  restMinutes: number
  autoStartNext: boolean
}

const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  restMinutes: 5,
  autoStartNext: false
}

const FOCUS_PRESETS = [15, 25, 45, 60]
const REST_PRESETS = [5, 10, 15, 20]
const MIN_MINUTES = 1
const MAX_MINUTES = 180

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      focusMinutes: clampInt(parsed.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
      restMinutes: clampInt(parsed.restMinutes, DEFAULT_SETTINGS.restMinutes),
      autoStartNext: parsed.autoStartNext === true
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

function clampInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? Math.round(v) : parseInt(String(v), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
}

// ============== 运行时状态 ==============
type Phase = 'focus' | 'rest' | 'wait_rest'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const engine = ref<PetEngine | null>(null)

// 设置相关
const settings = ref<Settings>(loadSettings())
// 编辑态的临时值（确认时才应用）
const draftFocus = ref(settings.value.focusMinutes)
const draftRest = ref(settings.value.restMinutes)
const draftAuto = ref(settings.value.autoStartNext)
const showSettings = ref(false)

// 运行相关
const phase = ref<Phase>('focus')
const focusSeconds = computed(() => settings.value.focusMinutes * 60)
const restSeconds = computed(() => settings.value.restMinutes * 60)
const remaining = ref(focusSeconds.value)
const isRunning = ref(false)
const showDialog = ref(false)
const dialogShake = ref(false)
const dialogText = ref('主人，你的脑子需要重启啦！')

let timerHandle: number | null = null
let dialogInterval: number | null = null

// ============== 派生计算 ==============
const petState = computed<PetState>(() => {
  if (phase.value === 'wait_rest') return 'knock'
  if (phase.value === 'rest') return 'rest'
  return 'sleep'
})

const mmss = computed(() => {
  const m = Math.floor(remaining.value / 60)
    .toString()
    .padStart(2, '0')
  const s = (remaining.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const totalSeconds = computed(() =>
  phase.value === 'rest' ? restSeconds.value : focusSeconds.value
)

const progress = computed(() => {
  if (totalSeconds.value === 0) return 0
  return ((totalSeconds.value - remaining.value) / totalSeconds.value) * 100
})

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'focus':
      return `🎯 专注中 · ${settings.value.focusMinutes} 分钟`
    case 'wait_rest':
      return '😾 催你休息！'
    case 'rest':
      return `🏖️ 休息时间 · ${settings.value.restMinutes} 分钟`
  }
})

const startLabel = computed(() => {
  if (phase.value === 'wait_rest') return '😾 去休息'
  if (phase.value === 'rest') return '▶ 开始休息'
  return '▶ 开始专注'
})

// ============== 核心控制逻辑 ==============
function start() {
  if (isRunning.value) return
  if (phase.value === 'wait_rest') {
    phase.value = 'rest'
    remaining.value = restSeconds.value
  }
  isRunning.value = true
  hideDialog()
  timerHandle = window.setInterval(() => {
    if (remaining.value > 0) {
      remaining.value--
    } else {
      handleTimerEnd()
    }
  }, 1000)
}

function pause() {
  isRunning.value = false
  if (timerHandle !== null) {
    clearInterval(timerHandle)
    timerHandle = null
  }
}

function reset() {
  pause()
  hideDialog()
  phase.value = 'focus'
  remaining.value = focusSeconds.value
}

function restNow() {
  pause()
  hideDialog()
  phase.value = 'rest'
  remaining.value = restSeconds.value
}

function handleTimerEnd() {
  pause()
  if (phase.value === 'focus') {
    phase.value = 'wait_rest'
    remaining.value = 0
    triggerKnocking()
  } else if (phase.value === 'rest') {
    if (settings.value.autoStartNext) {
      phase.value = 'focus'
      remaining.value = focusSeconds.value
      start()
    } else {
      phase.value = 'focus'
      remaining.value = focusSeconds.value
    }
  }
}

function triggerKnocking() {
  showDialog.value = true
  dialogShake.value = true

  if (dialogInterval !== null) clearInterval(dialogInterval)
  dialogInterval = window.setInterval(() => {
    showDialog.value = false
    setTimeout(() => {
      showDialog.value = true
      dialogShake.value = true
      setTimeout(() => (dialogShake.value = false), 600)
    }, 200)
  }, 2500)
}

function hideDialog() {
  showDialog.value = false
  dialogShake.value = false
  if (dialogInterval !== null) {
    clearInterval(dialogInterval)
    dialogInterval = null
  }
}

// ============== 设置面板逻辑 ==============
function openSettings() {
  draftFocus.value = settings.value.focusMinutes
  draftRest.value = settings.value.restMinutes
  draftAuto.value = settings.value.autoStartNext
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
}

function applyFocusPreset(m: number) {
  draftFocus.value = m
}

function applyRestPreset(m: number) {
  draftRest.value = m
}

function onDraftFocusInput(e: Event) {
  const target = e.target as HTMLInputElement
  const n = parseInt(target.value, 10)
  if (Number.isFinite(n)) {
    draftFocus.value = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
  }
}

function onDraftRestInput(e: Event) {
  const target = e.target as HTMLInputElement
  const n = parseInt(target.value, 10)
  if (Number.isFinite(n)) {
    draftRest.value = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n))
  }
}

function confirmSettings() {
  const newFocus = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(draftFocus.value)))
  const newRest = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(draftRest.value)))

  const focusChanged = newFocus !== settings.value.focusMinutes
  const restChanged = newRest !== settings.value.restMinutes

  settings.value = {
    focusMinutes: newFocus,
    restMinutes: newRest,
    autoStartNext: draftAuto.value
  }
  saveSettings(settings.value)

  // 当配置变更且当前没在运行时，重置剩余时间以匹配新配置
  if (!isRunning.value) {
    if (phase.value === 'focus' && focusChanged) {
      remaining.value = settings.value.focusMinutes * 60
    } else if (phase.value === 'rest' && restChanged) {
      remaining.value = settings.value.restMinutes * 60
    }
  }

  showSettings.value = false
}

function restoreDefaults() {
  draftFocus.value = DEFAULT_SETTINGS.focusMinutes
  draftRest.value = DEFAULT_SETTINGS.restMinutes
  draftAuto.value = DEFAULT_SETTINGS.autoStartNext
}

// ============== PetEngine 生命周期 ==============
watch(petState, (s) => {
  engine.value?.setState(s)
})

function onResize() {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  engine.value?.resize(rect.width, rect.height)
}

onMounted(async () => {
  await nextTick()
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  engine.value = new PetEngine(
    canvasRef.value,
    rect.width,
    rect.height
  )
  engine.value.setState(petState.value)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  pause()
  hideDialog()
  window.removeEventListener('resize', onResize)
  engine.value?.destroy()
  engine.value = null
})
</script>

<template>
  <div class="app-root">
    <!-- 顶部控制面板 -->
    <div class="panel">
      <div class="panel-header">
        <div class="phase-tag">{{ phaseLabel }}</div>
        <button class="settings-btn" @click="openSettings" title="设置">
          ⚙️
        </button>
      </div>

      <div class="timer">{{ mmss }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="buttons">
        <button v-if="!isRunning" class="btn primary" @click="start">
          {{ startLabel }}
        </button>
        <button v-else class="btn warn" @click="pause">⏸ 暂停</button>
        <button
          class="btn"
          @click="restNow"
          :disabled="phase === 'rest' && isRunning"
        >
          🏖️ 立刻休息
        </button>
        <button class="btn ghost" @click="reset">↺ 重置</button>
      </div>
    </div>

    <!-- 中部提示卡片 -->
    <div class="info-card">
      <p v-if="phase === 'focus'">
        🐾 小猫正在打盹儿陪你专注 {{ settings.focusMinutes }} 分钟，加油呀～
      </p>
      <p v-else-if="phase === 'wait_rest'">
        😾 时间到啦！快点「去休息」，不然它要把屏幕敲碎啦！
      </p>
      <p v-else>
        🏖️ 小猫戴上墨镜，躺平休息 {{ settings.restMinutes }} 分钟。享受一下吧～
      </p>
    </div>

    <!-- 宠物舞台 -->
    <div class="pet-stage" :class="{ shake: phase === 'wait_rest' }">
      <canvas ref="canvasRef" class="pet-canvas"></canvas>

      <!-- 对话框 -->
      <transition name="pop">
        <div v-if="showDialog" class="dialog" :class="{ 'dialog-shake': dialogShake }">
          <div class="dialog-bubble">
            <p>{{ dialogText }}</p>
            <span class="dialog-tail"></span>
          </div>
          <button class="dialog-btn" @click="restNow">🥺 好的好的</button>
        </div>
      </transition>
    </div>

    <!-- 设置弹窗 -->
    <transition name="fade">
      <div v-if="showSettings" class="settings-mask" @click.self="closeSettings">
        <div class="settings-panel">
          <div class="settings-header">
            <h3>⚙️ 番茄钟设置</h3>
            <button class="close-btn" @click="closeSettings">✕</button>
          </div>

          <div class="settings-body">
            <!-- 专注时长 -->
            <div class="setting-row">
              <label class="setting-label">专注时长</label>
              <div class="setting-control">
                <div class="input-group">
                  <input
                    type="number"
                    class="number-input"
                    :value="draftFocus"
                    :min="MIN_MINUTES"
                    :max="MAX_MINUTES"
                    @input="onDraftFocusInput"
                  />
                  <span class="unit">分钟</span>
                </div>
                <div class="preset-row">
                  <button
                    v-for="p in FOCUS_PRESETS"
                    :key="p"
                    class="preset-btn"
                    :class="{ active: draftFocus === p }"
                    @click="applyFocusPreset(p)"
                  >
                    {{ p }} 分
                  </button>
                </div>
              </div>
            </div>

            <!-- 休息时长 -->
            <div class="setting-row">
              <label class="setting-label">休息时长</label>
              <div class="setting-control">
                <div class="input-group">
                  <input
                    type="number"
                    class="number-input"
                    :value="draftRest"
                    :min="MIN_MINUTES"
                    :max="MAX_MINUTES"
                    @input="onDraftRestInput"
                  />
                  <span class="unit">分钟</span>
                </div>
                <div class="preset-row">
                  <button
                    v-for="p in REST_PRESETS"
                    :key="p"
                    class="preset-btn"
                    :class="{ active: draftRest === p }"
                    @click="applyRestPreset(p)"
                  >
                    {{ p }} 分
                  </button>
                </div>
              </div>
            </div>

            <!-- 自动下一轮 -->
            <div class="setting-row auto-row">
              <label class="setting-label"
                >休息结束后自动开始下一轮专注
                <span class="hint">（不催你，直接继续干活模式）</span></label
              >
              <label class="switch">
                <input type="checkbox" v-model="draftAuto" />
                <span class="slider"></span>
              </label>
            </div>

            <p class="settings-tip">
              💾 设置会自动保存在浏览器本地（localStorage），下次打开依然有效。
            </p>
          </div>

          <div class="settings-footer">
            <button class="btn ghost" @click="restoreDefaults">恢复默认</button>
            <button class="btn primary" @click="confirmSettings">保存并应用</button>
          </div>
        </div>
      </div>
    </transition>

    <div class="floor"></div>
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.panel {
  position: relative;
  z-index: 10;
  margin-top: 24px;
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  min-width: 360px;
  text-align: center;
  backdrop-filter: blur(6px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 4px;
}

.settings-btn {
  background: transparent;
  border: none;
  font-size: 22px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.15s, transform 0.15s;
  line-height: 1;
}
.settings-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  transform: rotate(45deg);
}

.phase-tag {
  display: inline-block;
  padding: 4px 14px;
  background: #ffeaa7;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: #6c4a00;
}

.timer {
  font-size: 56px;
  font-weight: 900;
  color: #2d3436;
  letter-spacing: 3px;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.progress-bar {
  margin: 12px auto 0;
  width: 260px;
  height: 10px;
  background: #ffe0e0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fd79a8, #e84393);
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 16px;
}

.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: #ffeaa7;
  color: #6c4a00;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  box-shadow: 0 4px 0 #d4a017;
}
.btn:hover:not(:disabled) {
  transform: translateY(-2px);
}
.btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #d4a017;
}
.btn.primary {
  background: #55efc4;
  color: #064e3b;
  box-shadow: 0 4px 0 #0b9b6c;
}
.btn.warn {
  background: #ffa502;
  color: #5a2d00;
  box-shadow: 0 4px 0 #b46a00;
}
.btn.ghost {
  background: transparent;
  color: #636e72;
  box-shadow: 0 0 0 2px #dfe6e9 inset;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-card {
  position: relative;
  z-index: 5;
  margin-top: 18px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  color: #2d3436;
  font-size: 14px;
  max-width: 520px;
  text-align: center;
}

.pet-stage {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  z-index: 2;
  pointer-events: none;
}

.pet-stage.shake {
  animation: stage-shake 0.25s infinite;
}

@keyframes stage-shake {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-4px, 2px); }
  50% { transform: translate(3px, -3px); }
  75% { transform: translate(-2px, 3px); }
  100% { transform: translate(0, 0); }
}

.pet-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.dialog {
  position: absolute;
  left: 50%;
  top: 18%;
  transform: translate(-50%, 0);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dialog-bubble {
  position: relative;
  background: #ffffff;
  border: 4px solid #2d3436;
  border-radius: 22px;
  padding: 18px 26px;
  font-size: 22px;
  font-weight: 800;
  color: #2d3436;
  box-shadow: 0 8px 0 #2d3436, 0 15px 30px rgba(0, 0, 0, 0.2);
  max-width: 80vw;
  white-space: nowrap;
}

.dialog-bubble p {
  margin: 0;
}

.dialog-tail {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%) rotate(180deg);
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 18px solid #2d3436;
}

.dialog-tail::after {
  content: '';
  position: absolute;
  top: -24px;
  left: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 14px solid #ffffff;
}

.dialog-shake .dialog-bubble {
  animation: bubble-shake 0.4s infinite;
}

@keyframes bubble-shake {
  0%, 100% { transform: rotate(-2deg) scale(1); }
  25% { transform: rotate(3deg) scale(1.05); }
  50% { transform: rotate(-3deg) scale(1); }
  75% { transform: rotate(2deg) scale(1.03); }
}

.dialog-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 16px;
  background: #fd79a8;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 0 #c74b7a;
  transition: transform 0.12s;
}

.dialog-btn:hover {
  transform: translateY(-2px);
}
.dialog-btn:active {
  transform: translateY(3px);
  box-shadow: 0 3px 0 #c74b7a;
}

/* ========== 设置面板 ========== */
.settings-mask {
  position: fixed;
  inset: 0;
  background: rgba(45, 52, 54, 0.45);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.settings-panel {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  background: linear-gradient(135deg, #fd79a8, #fdcb6e);
  color: #2d3436;
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.close-btn {
  background: rgba(255, 255, 255, 0.6);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  color: #2d3436;
  transition: background 0.15s;
}
.close-btn:hover {
  background: #fff;
}

.settings-body {
  padding: 22px;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.setting-row.auto-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: #f6f8fa;
  padding: 12px 16px;
  border-radius: 14px;
}

.setting-label {
  font-size: 14px;
  font-weight: 700;
  color: #2d3436;
}

.setting-label .hint {
  font-size: 12px;
  font-weight: 500;
  color: #636e72;
  margin-left: 6px;
}

.setting-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input {
  width: 100px;
  padding: 10px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #2d3436;
  border: 2px solid #dfe6e9;
  border-radius: 12px;
  outline: none;
  text-align: center;
  transition: border-color 0.15s;
}
.number-input:focus {
  border-color: #fd79a8;
}

.unit {
  font-size: 14px;
  color: #636e72;
  font-weight: 600;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn {
  padding: 6px 12px;
  border: 2px solid #dfe6e9;
  background: #fff;
  color: #636e72;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover {
  border-color: #fd79a8;
  color: #e84393;
}
.preset-btn.active {
  background: #fd79a8;
  color: #fff;
  border-color: #fd79a8;
}

/* 开关控件 */
.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 26px;
  cursor: pointer;
  flex-shrink: 0;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  inset: 0;
  background: #dfe6e9;
  border-radius: 999px;
  transition: background 0.2s;
}
.slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.switch input:checked + .slider {
  background: #55efc4;
}
.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.settings-tip {
  font-size: 12px;
  color: #636e72;
  margin: 18px 0 0;
  text-align: center;
  background: #fff5d6;
  padding: 10px 12px;
  border-radius: 12px;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px;
  background: #f6f8fa;
  border-top: 1px solid #dfe6e9;
}

/* 弹窗动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-active .settings-panel,
.fade-leave-active .settings-panel {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-from .settings-panel,
.fade-leave-to .settings-panel {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

/* Pop-in transition for dialog */
.pop-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
  transition: all 0.15s ease-in;
}
.pop-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.6);
}
.pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.9);
}

.floor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 80px;
  background: linear-gradient(180deg, rgba(195, 140, 75, 0.0) 0%, rgba(195, 140, 75, 0.85) 100%);
  z-index: 1;
  pointer-events: none;
}
</style>

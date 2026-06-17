<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { PetEngine, type PetState } from '../pet/PetEngine'

const FOCUS_SECONDS = 25 * 60
const REST_SECONDS = 5 * 60

type Phase = 'focus' | 'rest' | 'wait_rest'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const engine = ref<PetEngine | null>(null)

const phase = ref<Phase>('focus')
const remaining = ref(FOCUS_SECONDS)
const isRunning = ref(false)
const showDialog = ref(false)
const dialogShake = ref(false)
const dialogText = ref('主人，你的脑子需要重启啦！')
const dialogQueue = 0
let timerHandle: number | null = null
let dialogInterval: number | null = null

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

const progress = computed(() => {
  const total =
    phase.value === 'rest' ? REST_SECONDS : FOCUS_SECONDS
  return ((total - remaining.value) / total) * 100
})

const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'focus':
      return '🎯 专注中'
    case 'wait_rest':
      return '😾 催你休息！'
    case 'rest':
      return '🏖️ 休息时间'
  }
})

function start() {
  if (isRunning.value) return
  if (phase.value === 'wait_rest') {
    phase.value = 'rest'
    remaining.value = REST_SECONDS
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
  remaining.value = FOCUS_SECONDS
}

function restNow() {
  pause()
  hideDialog()
  phase.value = 'rest'
  remaining.value = REST_SECONDS
}

function handleTimerEnd() {
  pause()
  if (phase.value === 'focus') {
    phase.value = 'wait_rest'
    remaining.value = 0
    // Start knocking: show dialog repeatedly + shake
    triggerKnocking()
  } else if (phase.value === 'rest') {
    phase.value = 'focus'
    remaining.value = FOCUS_SECONDS
  }
}

function triggerKnocking() {
  showDialog.value = true
  dialogShake.value = true

  if (dialogInterval !== null) clearInterval(dialogInterval)
  dialogInterval = window.setInterval(() => {
    // Hide briefly then re-show for a "疯狂弹出" effect
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
    <!-- Top control panel -->
    <div class="panel">
      <div class="phase-tag">{{ phaseLabel }}</div>
      <div class="timer">{{ mmss }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="buttons">
        <button v-if="!isRunning" class="btn primary" @click="start">
          {{ phase === 'wait_rest' ? '😾 去休息' : phase === 'focus' ? '▶ 开始专注' : '▶ 开始休息' }}
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

    <!-- Middle info card -->
    <div class="info-card">
      <p v-if="phase === 'focus'">
        🐾 小猫正在打盹儿陪你专注，加油呀～
      </p>
      <p v-else-if="phase === 'wait_rest'">
        😾 时间到啦！快点「去休息」，不然它要把屏幕敲碎啦！
      </p>
      <p v-else>
        🏖️ 小猫戴上墨镜，躺平休息中。享受 5 分钟的惬意吧～
      </p>
    </div>

    <!-- Pet stage (Pixi canvas) -->
    <div class="pet-stage" :class="{ shake: phase === 'wait_rest' }">
      <canvas ref="canvasRef" class="pet-canvas"></canvas>

      <!-- Speech dialog overlay (HTML) -->
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

    <!-- Floor / sand -->
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

.phase-tag {
  display: inline-block;
  padding: 4px 14px;
  background: #ffeaa7;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: #6c4a00;
  margin-bottom: 6px;
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
</style>

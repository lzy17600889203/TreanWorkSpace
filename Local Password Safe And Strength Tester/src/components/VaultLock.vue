<template>
  <div class="vault-lock" :class="{ opening: opening }">
    <div class="frame">
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>

      <div class="doors">
        <div class="door door-left">
          <div class="metal">
            <div class="grain"></div>
            <div class="bolts">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
            <div class="hinge"></div>
            <div class="label">SECURE</div>
          </div>
        </div>
        <div class="door door-right">
          <div class="metal">
            <div class="grain"></div>
            <div class="bolts">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
            <div class="hinge"></div>
            <div class="dial" :class="{ spin: spinning }">
              <div class="dial-marks">
                <span v-for="i in 24" :key="i"></span>
              </div>
              <div class="dial-center">🔐</div>
            </div>
            <div class="label">LOCKED</div>
          </div>
        </div>
        <div class="door-gap">
          <div class="gap-shine"></div>
        </div>
      </div>

      <div class="status-bar">
        <span class="dot red"></span>
        <span>{{ statusText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  opening: { type: Boolean, default: false },
  spinning: { type: Boolean, default: false },
  isFirstTime: { type: Boolean, default: false }
})

const statusText = computed(() => {
  if (props.opening) return '正在验证主密码...'
  if (props.isFirstTime) return '欢迎 · 请设置你的主密码'
  return '请输入主密码以解锁保险箱'
})
</script>

<style scoped>
.vault-lock {
  perspective: 1200px;
}

.frame {
  position: relative;
  background: linear-gradient(135deg, #2a2a3a 0%, #1a1a28 50%, #2a2a3a 100%);
  padding: 14px;
  border-radius: 16px;
  box-shadow:
    0 0 0 4px #15151f,
    0 0 0 6px #2e2e42,
    0 12px 40px rgba(0, 0, 0, 0.55);
}

.corner {
  position: absolute;
  width: 22px;
  height: 22px;
  border: 3px solid #4a4a68;
  opacity: 0.65;
}
.corner.tl { top: 4px; left: 4px; border-right: none; border-bottom: none; border-radius: 10px 0 0 0; }
.corner.tr { top: 4px; right: 4px; border-left: none; border-bottom: none; border-radius: 0 10px 0 0; }
.corner.bl { bottom: 4px; left: 4px; border-right: none; border-top: none; border-radius: 0 0 0 10px; }
.corner.br { bottom: 4px; right: 4px; border-left: none; border-top: none; border-radius: 0 0 10px 0; }

.doors {
  position: relative;
  display: flex;
  height: 220px;
  background: linear-gradient(180deg, #0a0a14 0%, #0d1118 100%);
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #0a0a0f;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8) inset;
}

.door {
  position: relative;
  flex: 1;
  transition: transform 1.2s cubic-bezier(0.77, 0, 0.175, 1);
  overflow: hidden;
}

.vault-lock.opening .door-left {
  transform: translateX(-100%) rotateY(-18deg);
}
.vault-lock.opening .door-right {
  transform: translateX(100%) rotateY(18deg);
}

.metal {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #70708a 0%, #4a4a5e 50%, #6a6a84 100%);
  border: 2px solid #2a2a38;
  display: flex;
  align-items: center;
  justify-content: center;
}

.door-left .metal {
  border-right: 3px solid #1a1a28;
  margin-right: -2px;
}
.door-right .metal {
  border-left: 3px solid #1a1a28;
  margin-left: -2px;
}

.grain {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(45deg, transparent 0, transparent 8px, rgba(0,0,0,0.08) 8px, rgba(0,0,0,0.08) 10px),
    repeating-linear-gradient(-45deg, transparent 0, transparent 8px, rgba(255,255,255,0.04) 8px, rgba(255,255,255,0.04) 10px);
  pointer-events: none;
}

.bolts {
  position: absolute;
  inset: 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
}

.bolts span {
  width: 12px;
  height: 12px;
  background: radial-gradient(circle at 30% 30%, #a8a8c0, #3a3a4e 70%);
  border-radius: 50%;
  justify-self: center;
  align-self: center;
  box-shadow: 0 2px 3px rgba(0,0,0,0.5), 0 0 0 1px #1a1a28;
}

.hinge {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 44px;
  background: linear-gradient(180deg, #5a5a74, #3a3a4e);
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0,0,0,0.6);
}

.door-left .hinge { left: -3px; }
.door-right .hinge { right: -3px; }

.label {
  position: absolute;
  bottom: 8px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(220, 220, 240, 0.6);
  padding: 2px 8px;
  border: 1px solid rgba(220, 220, 240, 0.25);
  border-radius: 3px;
  background: rgba(0,0,0,0.35);
}

.door-left .label { left: 50%; transform: translateX(-50%); }
.door-right .label { right: 50%; transform: translateX(50%); }

.door-gap {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent 0%, #000 20%, #1a1a28 50%, #000 80%, transparent 100%);
  pointer-events: none;
}
.gap-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent);
}

.dial {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #8080a0, #3a3a4e 70%);
  position: relative;
  box-shadow:
    0 4px 12px rgba(0,0,0,0.7),
    0 0 0 3px #2a2a38;
  z-index: 2;
  transition: transform 0.3s;
}
.dial.spin {
  animation: dialSpin 1.2s cubic-bezier(0.3, 0, 0.7, 1);
}
@keyframes dialSpin {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(540deg); }
  50% { transform: rotate(200deg); }
  100% { transform: rotate(1260deg); }
}

.dial-marks {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
}
.dial-marks span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 5px;
  background: #d8d8e8;
  transform-origin: 50% 32px;
}

.dial-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background: radial-gradient(circle at 35% 35%, #d8d8e8, #5a5a74);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5) inset;
}

.status-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #c0c0d8;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}
.dot.red {
  background: #ff5577;
  box-shadow: 0 0 10px rgba(255, 85, 119, 0.7);
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 500px) {
  .doors { height: 180px; }
  .dial { width: 64px; height: 64px; }
  .dial-center { width: 28px; height: 28px; font-size: 14px; }
  .bolts span { width: 9px; height: 9px; }
}
</style>

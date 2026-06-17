<template>
  <div class="safe-container" :class="{ unlocked: isUnlocked }">
    <div class="safe-frame">
      <div class="vault-corner tl"></div>
      <div class="vault-corner tr"></div>
      <div class="vault-corner bl"></div>
      <div class="vault-corner br"></div>

      <div class="safe-inner">
        <div class="door door-left" :class="{ open: isUnlocked }">
          <div class="door-metal">
            <div class="metal-grain"></div>
            <div class="bolts">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
            <div class="hinge h1"></div>
            <div class="hinge h2"></div>
            <div class="door-label">SECURE</div>
          </div>
        </div>

        <div class="door door-right" :class="{ open: isUnlocked }">
          <div class="door-metal">
            <div class="metal-grain"></div>
            <div class="bolts">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
            <div class="hinge h1"></div>
            <div class="hinge h2"></div>
            <div class="combination-lock" v-if="!isUnlocked">
              <div class="dial" :class="{ spin: spinning }">
                <div class="dial-marks">
                  <span v-for="i in 40" :key="i"></span>
                </div>
                <div class="dial-center">🔐</div>
              </div>
            </div>
            <div class="door-label">LOCKED</div>
          </div>
        </div>

        <div class="safe-content" :class="{ visible: isUnlocked }">
          <slot></slot>
        </div>

        <div class="safe-glow" :class="{ active: isUnlocked }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isUnlocked: { type: Boolean, default: false },
  spinning: { type: Boolean, default: false }
})
</script>

<style scoped>
.safe-container {
  perspective: 1200px;
  padding: 10px;
}

.safe-frame {
  position: relative;
  background: linear-gradient(135deg, #2a2a3a 0%, #1a1a28 50%, #2a2a3a 100%);
  padding: 18px;
  border-radius: 20px;
  box-shadow:
    0 0 0 4px #15151f,
    0 0 0 6px #2e2e42,
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 80px rgba(0, 0, 0, 0.4) inset;
}

.vault-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 3px solid #4a4a68;
  opacity: 0.7;
}

.vault-corner.tl { top: 6px; left: 6px; border-right: none; border-bottom: none; border-radius: 12px 0 0 0; }
.vault-corner.tr { top: 6px; right: 6px; border-left: none; border-bottom: none; border-radius: 0 12px 0 0; }
.vault-corner.bl { bottom: 6px; left: 6px; border-right: none; border-top: none; border-radius: 0 0 0 12px; }
.vault-corner.br { bottom: 6px; right: 6px; border-left: none; border-top: none; border-radius: 0 0 12px 0; }

.safe-inner {
  position: relative;
  min-height: 440px;
  background:
    linear-gradient(180deg, #0a0a12 0%, #0d1118 100%);
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #0a0a0f;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.8) inset;
}

.door {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  z-index: 10;
  transition: transform 1.4s cubic-bezier(0.77, 0, 0.175, 1);
}

.door-left {
  left: 0;
  transform-origin: left center;
}

.door-right {
  right: 0;
  transform-origin: right center;
}

.door-left.open {
  transform: translateX(-100%) rotateY(-20deg);
}

.door-right.open {
  transform: translateX(100%) rotateY(20deg);
}

.door-metal {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      135deg,
      #6b6b80 0%,
      #4a4a5e 20%,
      #8a8aa0 40%,
      #5a5a74 60%,
      #7a7a90 80%,
      #4a4a5e 100%
    );
  border: 2px solid #2a2a38;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(255, 255, 255, 0.05) inset;
  overflow: hidden;
}

.door-left .door-metal {
  border-right: 3px solid #1a1a28;
}

.door-right .door-metal {
  border-left: 3px solid #1a1a28;
}

.metal-grain {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      45deg,
      transparent 0px,
      transparent 8px,
      rgba(0, 0, 0, 0.08) 8px,
      rgba(0, 0, 0, 0.08) 10px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent 0px,
      transparent 8px,
      rgba(255, 255, 255, 0.04) 8px,
      rgba(255, 255, 255, 0.04) 10px
    );
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
  width: 14px;
  height: 14px;
  background: radial-gradient(circle at 30% 30%, #a8a8c0, #3a3a4e 70%);
  border-radius: 50%;
  justify-self: center;
  align-self: center;
  box-shadow:
    0 2px 3px rgba(0, 0, 0, 0.5),
    0 0 0 1px #1a1a28,
    0 0 4px rgba(0, 0, 0, 0.4) inset;
  position: relative;
}

.bolts span::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-top: 1px solid #2a2a38;
  transform: rotate(45deg);
}

.hinge {
  position: absolute;
  width: 16px;
  height: 48px;
  background: linear-gradient(180deg, #5a5a74, #3a3a4e);
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
}

.door-left .hinge { right: -4px; }
.door-right .hinge { left: -4px; }
.hinge.h1 { top: 80px; }
.hinge.h2 { bottom: 80px; }

.door-label {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Courier New', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 3px;
  color: rgba(200, 200, 220, 0.55);
  padding: 4px 10px;
  border: 1px solid rgba(200, 200, 220, 0.25);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
}

.combination-lock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.dial {
  width: 90px;
  height: 90px;
  background:
    radial-gradient(circle at 35% 35%, #7a7a94, #3a3a4e 70%);
  border-radius: 50%;
  position: relative;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.7),
    0 0 0 3px #2a2a38,
    0 0 20px rgba(255, 180, 50, 0.15);
}

.dial.spin {
  animation: spinDial 1.5s cubic-bezier(0.3, 0, 0.7, 1);
}

@keyframes spinDial {
  0% { transform: rotate(0deg); }
  30% { transform: rotate(480deg); }
  60% { transform: rotate(200deg); }
  100% { transform: rotate(1080deg); }
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
  height: 6px;
  background: #d8d8e8;
  transform-origin: 50% 36px;
}

.dial-marks span:nth-child(5n) {
  height: 10px;
  background: #ffcc00;
}

.dial-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  background: radial-gradient(circle at 35% 35%, #d8d8e8, #5a5a74);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) inset;
}

.safe-content {
  padding: 22px;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.8s 0.6s ease, transform 0.8s 0.6s ease;
  position: relative;
  z-index: 1;
}

.safe-content.visible {
  opacity: 1;
  transform: scale(1);
}

.safe-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, rgba(0, 255, 150, 0.2), transparent 60%);
  opacity: 0;
  transition: opacity 1.2s ease;
}

.safe-glow.active {
  opacity: 1;
  animation: glowPulse 3s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
</style>

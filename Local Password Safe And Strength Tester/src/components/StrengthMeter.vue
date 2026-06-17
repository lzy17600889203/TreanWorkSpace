<template>
  <div class="strength-box">
    <div class="strength-bar-wrap">
      <div
        class="strength-bar"
        :class="['level-' + analysis.level, { shake: analysis.level === 'weak' && analysis.details.length > 0 }]"
      >
        <div class="strength-fill" :style="{ width: analysis.score + '%' }">
          <div class="glow-line"></div>
        </div>
        <div class="ticks">
          <span v-for="i in 20" :key="i"></span>
        </div>
      </div>
      <div class="score-number" :class="'level-' + analysis.level">
        {{ analysis.score }}
      </div>
    </div>

    <div class="strength-meta">
      <div class="character-tag" v-if="analysis.details.hasLower">小写</div>
      <div class="character-tag" v-if="analysis.details.hasUpper">大写</div>
      <div class="character-tag" v-if="analysis.details.hasDigit">数字</div>
      <div class="character-tag" v-if="analysis.details.hasSymbol">符号</div>
      <div class="character-tag length-tag" v-if="analysis.details.length">
        {{ analysis.details.length }} 位
      </div>
    </div>

    <div class="strength-label" :class="'level-' + analysis.level">
      {{ analysis.label }}
    </div>

    <div class="roles">
      <div
        class="role thief"
        :class="{ active: analysis.level === 'weak' && analysis.details.length > 0 }"
        v-show="analysis.level === 'weak' && analysis.details.length > 0"
      >
        <div class="role-avatar">
          <div class="thief-face">
            <div class="mask"></div>
            <div class="eye left"></div>
            <div class="eye right"></div>
            <div class="mouth smile"></div>
            <div class="hat">
              <div class="hat-stripe"></div>
            </div>
          </div>
          <div class="bag">
            <div class="coin c1">$</div>
            <div class="coin c2">$</div>
            <div class="coin c3">$</div>
          </div>
        </div>
        <div class="role-name">小偷 🦹</div>
        <div class="role-line">"嘿嘿，这个我喜欢~"</div>
      </div>

      <div
        class="role bodyguard"
        :class="{ active: analysis.level === 'strong' || analysis.level === 'beast' }"
        v-show="analysis.level === 'strong' || analysis.level === 'beast'"
      >
        <div class="role-avatar">
          <div class="bodyguard-face">
            <div class="sunglasses"></div>
            <div class="mouth-smile"></div>
            <div class="cap"></div>
            <div class="ear-left"></div>
            <div class="ear-right"></div>
          </div>
          <div class="thumb">👍</div>
        </div>
        <div class="role-name">保镖 🕴️</div>
        <div class="role-line" v-if="analysis.level === 'beast'">
          "长官，您的密码固若金汤！"
        </div>
        <div class="role-line" v-else>"不错，继续保持！"</div>
      </div>

      <div class="role neutral" v-if="analysis.level === 'medium' || analysis.level === 'empty'">
        <div class="role-avatar small">
          <div class="neutral-face">🤔</div>
        </div>
        <div class="role-name">系统提示</div>
        <div class="role-line">{{ analysis.level === 'empty' ? '输入密码开始测试' : '还差一点点就完美啦' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  analysis: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.strength-box {
  background: rgba(20, 20, 40, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  margin-top: 14px;
  backdrop-filter: blur(10px);
}

.strength-bar-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.strength-bar {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.3s ease;
}

.strength-bar.level-weak {
  box-shadow: 0 0 18px rgba(255, 60, 80, 0.4) inset;
}
.strength-bar.level-medium {
  box-shadow: 0 0 18px rgba(255, 180, 40, 0.35) inset;
}
.strength-bar.level-strong,
.strength-bar.level-beast {
  box-shadow: 0 0 18px rgba(80, 255, 150, 0.35) inset;
}

.strength-bar.shake {
  animation: barShake 0.5s ease-in-out infinite;
}

@keyframes barShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px) rotate(-0.3deg); }
  75% { transform: translateX(3px) rotate(0.3deg); }
}

.strength-fill {
  height: 100%;
  transition: width 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2), background 0.3s;
  position: relative;
  overflow: hidden;
}

.level-weak .strength-fill {
  background: linear-gradient(90deg, #ff3860 0%, #ff6b8a 50%, #ff3860 100%);
  background-size: 200% 100%;
  animation: weakFlow 1.5s linear infinite;
}

@keyframes weakFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

.level-medium .strength-fill {
  background: linear-gradient(90deg, #ff9f43, #feca57);
}

.level-strong .strength-fill {
  background: linear-gradient(90deg, #1dd1a1, #10ac84);
}

.level-beast .strength-fill {
  background: linear-gradient(
    90deg,
    #00ff88 0%,
    #00ffcc 30%,
    #00ff88 50%,
    #00ffcc 70%,
    #00ff88 100%
  );
  background-size: 300% 100%;
  animation: beastFlow 2s linear infinite;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.6), 0 0 40px rgba(0, 255, 200, 0.3);
}

@keyframes beastFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

.glow-line {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  animation: sweep 2s linear infinite;
}

@keyframes sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.ticks {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.ticks span {
  flex: 1;
  border-right: 1px solid rgba(0, 0, 0, 0.15);
}

.ticks span:last-child {
  border-right: none;
}

.score-number {
  min-width: 52px;
  text-align: center;
  font-weight: 800;
  font-size: 20px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.score-number.level-weak {
  color: #ff4757;
  text-shadow: 0 0 10px rgba(255, 71, 87, 0.6);
}
.score-number.level-medium {
  color: #ffa502;
  text-shadow: 0 0 10px rgba(255, 165, 2, 0.6);
}
.score-number.level-strong,
.score-number.level-beast {
  color: #2ed573;
  text-shadow: 0 0 10px rgba(46, 213, 115, 0.6);
}

.strength-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.character-tag {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 20px;
  background: rgba(46, 213, 115, 0.15);
  border: 1px solid rgba(46, 213, 115, 0.35);
  color: #2ed573;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.length-tag {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #a0a0c0;
}

.strength-label {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
}

.strength-label.level-weak {
  color: #ff6b8a;
}
.strength-label.level-medium {
  color: #feca57;
}
.strength-label.level-strong,
.strength-label.level-beast {
  color: #2ed573;
}

.roles {
  margin-top: 16px;
  min-height: 120px;
}

.role {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  animation: fadeInUp 0.45s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.role.thief {
  background: linear-gradient(90deg, rgba(255, 56, 96, 0.12), rgba(255, 56, 96, 0.04));
  border: 1px solid rgba(255, 56, 96, 0.25);
}

.role.bodyguard {
  background: linear-gradient(90deg, rgba(46, 213, 115, 0.12), rgba(46, 213, 115, 0.04));
  border: 1px solid rgba(46, 213, 115, 0.25);
}

.role.neutral {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.role-avatar {
  position: relative;
  width: 84px;
  height: 84px;
  flex-shrink: 0;
}

.role-avatar.small {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
}

.neutral-face {
  font-size: 48px;
}

/* 小偷 */
.thief-face {
  width: 72px;
  height: 72px;
  background: #f4c29a;
  border-radius: 50%;
  position: absolute;
  top: 12px;
  left: 6px;
  animation: thiefBounce 0.8s ease-in-out infinite;
}

@keyframes thiefBounce {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-3px) rotate(2deg); }
}

.mask {
  position: absolute;
  top: 26px;
  left: 4px;
  right: 4px;
  height: 16px;
  background: #2d2d2d;
  border-radius: 4px;
}

.eye {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ffeb3b;
  border-radius: 50%;
  top: 30px;
  z-index: 2;
  animation: eyeShine 1s infinite;
}

.eye.left {
  left: 18px;
}

.eye.right {
  right: 18px;
}

@keyframes eyeShine {
  0%, 100% { box-shadow: 0 0 4px #ffeb3b; }
  50% { box-shadow: 0 0 12px #ffeb3b; }
}

.mouth.smile {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 14px;
  background: #5a1a1a;
  border-radius: 0 0 20px 20px;
}

.hat {
  position: absolute;
  top: -6px;
  left: -4px;
  right: -4px;
  height: 22px;
  background: #1a1a1a;
  border-radius: 50% 50% 10% 10% / 80% 80% 20% 20%;
}

.hat-stripe {
  position: absolute;
  bottom: 3px;
  left: 0;
  right: 0;
  height: 4px;
  background: #b33030;
}

.bag {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 40px;
  height: 40px;
  background: #6b4423;
  border-radius: 8px 8px 12px 12px;
  border: 2px solid #4a2f18;
  animation: bagShake 0.6s ease-in-out infinite;
}

@keyframes bagShake {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

.coin {
  position: absolute;
  width: 18px;
  height: 18px;
  background: radial-gradient(circle at 30% 30%, #ffd700, #b8860b);
  border-radius: 50%;
  color: #b8860b;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #b8860b;
  animation: coinFly 1.2s ease-in infinite;
  opacity: 0;
}

.c1 { animation-delay: 0s; }
.c2 { animation-delay: 0.4s; }
.c3 { animation-delay: 0.8s; }

@keyframes coinFly {
  0% {
    top: 40px;
    left: 12px;
    opacity: 0;
    transform: scale(0.5);
  }
  20% {
    opacity: 1;
    transform: scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    top: -40px;
    left: 60px;
    opacity: 0;
    transform: scale(1) rotate(720deg);
  }
}

/* 保镖 */
.bodyguard-face {
  width: 72px;
  height: 72px;
  background: #f4c29a;
  border-radius: 50%;
  position: absolute;
  top: 12px;
  left: 6px;
  animation: guardNod 2s ease-in-out infinite;
}

@keyframes guardNod {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-2deg); }
}

.sunglasses {
  position: absolute;
  top: 26px;
  left: 8px;
  right: 8px;
  height: 18px;
  background: #0a0a0a;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 200, 255, 0.5);
  animation: glassShine 2s infinite;
}

@keyframes glassShine {
  0%, 100% { box-shadow: 0 0 10px rgba(0, 200, 255, 0.5); }
  50% { box-shadow: 0 0 18px rgba(0, 200, 255, 0.9); }
}

.mouth-smile {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 4px;
  background: #5a1a1a;
  border-radius: 2px;
}

.cap {
  position: absolute;
  top: -4px;
  left: -2px;
  right: -2px;
  height: 20px;
  background: #1e3a5f;
  border-radius: 50% 50% 10% 10% / 70% 70% 30% 30%;
}

.ear-left, .ear-right {
  position: absolute;
  width: 8px;
  height: 14px;
  background: #f4c29a;
  border-radius: 50%;
  top: 28px;
}
.ear-left { left: -2px; }
.ear-right { right: -2px; }

.thumb {
  position: absolute;
  bottom: 4px;
  right: 0;
  font-size: 34px;
  animation: thumbUp 1.5s ease-in-out infinite;
}

@keyframes thumbUp {
  0%, 100% { transform: rotate(-5deg) scale(1); }
  50% { transform: rotate(8deg) scale(1.1); }
}

.role-name {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.role.thief .role-name {
  color: #ff6b8a;
}
.role.bodyguard .role-name {
  color: #2ed573;
}
.role.neutral .role-name {
  color: #a0a0c0;
}

.role-line {
  font-size: 12px;
  color: #c8c8e0;
  font-style: italic;
}
</style>

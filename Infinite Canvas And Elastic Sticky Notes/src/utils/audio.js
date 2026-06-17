// 使用 Web Audio API 即时合成"唰"的音效，避免外部资源
let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      return null
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function playWhoosh() {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const duration = 0.35

  // 白噪声作为基础风声
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  // 带通滤波器：频率随时间从高滑到低，营造"嗖"的感觉
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.8
  filter.frequency.setValueAtTime(1800, now)
  filter.frequency.exponentialRampToValueAtTime(180, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(now)
  noise.stop(now + duration + 0.05)
}

export function playSnap() {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  // 短促的吸附音：一次正弦脉冲
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(620, now)
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.12)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.18)
}

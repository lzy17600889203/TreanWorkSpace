let cachedCtx = null

function getCtx() {
  if (cachedCtx) return cachedCtx
  try {
    cachedCtx = new (window.AudioContext || window.webkitAudioContext)()
  } catch (e) {
    cachedCtx = null
  }
  return cachedCtx
}

function beep(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

export function playClick() {
  beep(800, 0.06, 'square', 0.1)
}

export function playMetalClank() {
  beep(180, 0.18, 'sawtooth', 0.22, 0)
  beep(120, 0.25, 'square', 0.18, 0.08)
  beep(600, 0.05, 'square', 0.12, 0.18)
}

export function playSuccess() {
  beep(523, 0.12, 'triangle', 0.15, 0)
  beep(659, 0.12, 'triangle', 0.15, 0.12)
  beep(784, 0.2, 'triangle', 0.18, 0.24)
}

export function playError() {
  beep(200, 0.2, 'sawtooth', 0.2)
}

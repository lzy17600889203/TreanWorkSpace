let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    const CtxClass = window.AudioContext || window.webkitAudioContext
    if (CtxClass) {
      audioCtx = new CtxClass()
    }
  }
  return audioCtx
}

export function playAirplaneTakeoff() {
  const ctx = getCtx()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const now = ctx.currentTime
  const duration = 3.5

  const engineOsc = ctx.createOscillator()
  engineOsc.type = 'sawtooth'
  engineOsc.frequency.setValueAtTime(80, now)
  engineOsc.frequency.exponentialRampToValueAtTime(450, now + duration)

  const engineOsc2 = ctx.createOscillator()
  engineOsc2.type = 'square'
  engineOsc2.frequency.setValueAtTime(40, now)
  engineOsc2.frequency.exponentialRampToValueAtTime(220, now + duration)
  engineOsc2.detune.value = 8

  const engineGain = ctx.createGain()
  engineGain.gain.setValueAtTime(0, now)
  engineGain.gain.linearRampToValueAtTime(0.15, now + 0.3)
  engineGain.gain.linearRampToValueAtTime(0.25, now + 1.5)
  engineGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  const engineFilter = ctx.createBiquadFilter()
  engineFilter.type = 'lowpass'
  engineFilter.frequency.setValueAtTime(800, now)
  engineFilter.frequency.linearRampToValueAtTime(2500, now + duration)

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.5
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0, now)
  noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.5)
  noiseGain.gain.linearRampToValueAtTime(0.18, now + 2)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.setValueAtTime(500, now)
  noiseFilter.frequency.linearRampToValueAtTime(4000, now + duration)
  noiseFilter.Q.value = 0.8

  const whooshOsc = ctx.createOscillator()
  whooshOsc.type = 'sine'
  whooshOsc.frequency.setValueAtTime(200, now + 2.5)
  whooshOsc.frequency.exponentialRampToValueAtTime(800, now + duration)

  const whooshGain = ctx.createGain()
  whooshGain.gain.setValueAtTime(0, now + 2.5)
  whooshGain.gain.linearRampToValueAtTime(0.12, now + 3)
  whooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  const masterGain = ctx.createGain()
  masterGain.gain.value = 1.0

  engineOsc.connect(engineFilter)
  engineOsc2.connect(engineFilter)
  engineFilter.connect(engineGain)
  engineGain.connect(masterGain)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(masterGain)

  whooshOsc.connect(whooshGain)
  whooshGain.connect(masterGain)

  masterGain.connect(ctx.destination)

  engineOsc.start(now)
  engineOsc2.start(now)
  noise.start(now)
  whooshOsc.start(now + 2.5)

  engineOsc.stop(now + duration)
  engineOsc2.stop(now + duration)
  noise.stop(now + duration)
  whooshOsc.stop(now + duration)
}

export function playClickSound() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.15)
}

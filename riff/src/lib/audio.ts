let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

type BeepKind = 'start' | 'end' | 'tick'

const TONES: Record<BeepKind, { freq: number; ms: number }> = {
  start: { freq: 660, ms: 140 },
  end: { freq: 440, ms: 320 },
  tick: { freq: 880, ms: 80 },
}

/** Short synthesized cue. Silent and safe when audio is unavailable. */
export function playCue(kind: BeepKind, enabled = true): void {
  if (!enabled) return
  const context = getContext()
  if (!context) return
  if (context.state === 'suspended') void context.resume()
  const { freq, ms } = TONES[kind]
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + ms / 1000)
  osc.connect(gain)
  gain.connect(context.destination)
  osc.start()
  osc.stop(context.currentTime + ms / 1000)
}

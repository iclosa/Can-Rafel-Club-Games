// Efectes de so generats amb Web Audio (sense fitxers). S'usen al reveal.
// L'AudioContext necessita un gest d'usuari previ; com que host i jugador han
// clicat abans, el reprenem si cal.

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function blip(
  ac: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  type: OscillatorType,
  peak: number
) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(startAt)
  osc.stop(startAt + dur)
}

// Arpegi ascendent alegre (C–E–G).
export function playCorrect() {
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime
  blip(ac, 523.25, t, 0.18, 'triangle', 0.25)
  blip(ac, 659.25, t + 0.12, 0.18, 'triangle', 0.25)
  blip(ac, 783.99, t + 0.24, 0.32, 'triangle', 0.3)
}

// Brunzit descendent d'error.
export function playWrong() {
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime
  blip(ac, 220, t, 0.25, 'sawtooth', 0.2)
  blip(ac, 155.56, t + 0.16, 0.45, 'sawtooth', 0.2)
}

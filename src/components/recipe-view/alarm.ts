// The alarm a timer sounds when its time is up: beeps like a kitchen
// timer's, made in the page with Web Audio, since browsers offer no way to
// play the device's own alert sounds. Browsers only let a page make sound
// once someone has tapped or typed in it, so a tap unlocks the alarm before
// it's needed.

// How long a timer whose time is up keeps beeping, and how often a group
// of beeps starts.
export const ALARM_FOR_MS = 60_000
export const ALARM_EVERY_MS = 2_000

// Four beeps a group, each this long, with gaps as long between them.
const BEEPS = 4
const BEEP_SECONDS = 0.09
const PITCH = 2000

// Whether a timer that ends at `endsAt` is beeping at `now`.
export function isRinging(endsAt: number, now: number): boolean {
  return now >= endsAt && now < endsAt + ALARM_FOR_MS
}

let context: AudioContext | null = null

// Lets the alarm sound later. Call it from a tap or key press.
export function unlockAlarm() {
  if (typeof AudioContext === 'undefined') return
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
}

// One beep: a bright sine, switched on and off in a few milliseconds, so
// it starts and stops cleanly instead of clicking.
function beep(audio: AudioContext, at: number) {
  const gain = audio.createGain()
  gain.connect(audio.destination)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.2, at + 0.005)
  gain.gain.setValueAtTime(0.2, at + BEEP_SECONDS - 0.005)
  gain.gain.linearRampToValueAtTime(0, at + BEEP_SECONDS)
  const tone = audio.createOscillator()
  tone.frequency.value = PITCH
  tone.connect(gain)
  tone.start(at)
  tone.stop(at + BEEP_SECONDS)
}

// A group of beeps: beep-beep-beep-beep. Silent until unlocked.
export function playAlarm() {
  if (context?.state !== 'running') return
  const now = context.currentTime
  for (let i = 0; i < BEEPS; i++) beep(context, now + i * BEEP_SECONDS * 2)
}

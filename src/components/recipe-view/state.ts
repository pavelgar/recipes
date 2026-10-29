import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/components/ui/toast'
import {
  ALARM_EVERY_MS,
  ALARM_FOR_MS,
  isRinging,
  playAlarm,
  unlockAlarm,
} from '@/components/recipe-view/alarm'
import { FINISHED_TIMER_KEPT_MS } from '@/components/recipe-view/recipe-progress'
import {
  formatCount,
  scaleServings,
  servingsCount,
  servingsStep,
} from '@/core/servings'
import { m } from '@/paraglide/messages'
import type { ReadSection, TimePiece } from '@/components/recipe-view/lines'
import type { Language } from '@/core/quantities'
import type { KeptTimer } from '@/components/recipe-view/recipe-progress'

// --- Servings ---

// The servings the recipe is shown for, starting from those kept, or the
// recipe's own. Servings with a number ("4 annosta") step from it and read
// with the number changed; servings without one change as a multiple of
// the recipe ("× 2").
export function useServings(
  written: string | null,
  language: Language | null,
  kept: number | null,
) {
  const base = servingsCount(written, language)
  const [count, setCount] = useState(kept ?? base ?? 1)
  const factor = base === null ? count : count / base
  const step = servingsStep(base)

  const times = `× ${formatCount(count, language)}`
  const label = !written
    ? times
    : base === null
      ? count === 1
        ? written
        : `${written} ${times}`
      : scaleServings(written, factor, language)

  return {
    label,
    factor,
    changed: factor !== 1,
    // What to keep: null while the servings are the recipe's own.
    kept: factor === 1 ? null : count,
    less: () => setCount((c) => Math.max(step, c - step)),
    more: () => setCount((c) => c + step),
    canLess: count > step,
  }
}

export type Servings = ReturnType<typeof useServings>

// --- Crossing off ---

// Which lines are crossed off, ingredients and steps alike, by line key,
// starting from those kept.
export function useCrossOff(kept: ReadonlyArray<string>) {
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set(kept))
  const toggle = useCallback(
    (key: string) =>
      setDone((d) => {
        const next = new Set(d)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
    [],
  )
  const clear = useCallback(
    (keys: ReadonlyArray<string>) =>
      setDone((d) => {
        const next = new Set(d)
        for (const key of keys) next.delete(key)
        return next
      }),
    [],
  )
  const has = useCallback((key: string) => done.has(key), [done])
  return { done, toggle, clear, has }
}

export type CrossOff = ReturnType<typeof useCrossOff>

// Every step in order, numbered again after each heading as the editor
// numbers them, how many are crossed off, and the first one not yet
// crossed off: the step to do now.
export function useStepOrder(
  steps: ReadonlyArray<ReadSection>,
  cross: CrossOff,
) {
  const flat = steps.flatMap((section) =>
    section.lines.map((line, i) => ({ line, number: i + 1 })),
  )
  const currentIndex = flat.findIndex((s) => !cross.has(s.line.key))
  return {
    flat,
    done: flat.filter((s) => cross.has(s.line.key)).length,
    currentIndex,
    current: currentIndex === -1 ? null : flat[currentIndex].line.key,
  }
}

export type StepOrder = ReturnType<typeof useStepOrder>

// --- Timers ---

export type Timer = KeptTimer & { id: number }

// Timers started from times in steps, starting from those kept, which ran
// on while the page was closed. Several can run at once. A timer goes once
// its time has long been up, unless it's stopped sooner.
export function useTimers(kept: ReadonlyArray<KeptTimer>) {
  const [timers, setTimers] = useState<ReadonlyArray<Timer>>(() =>
    kept.map((timer, id) => ({ ...timer, id })),
  )
  const nextId = useRef(kept.length)

  useEffect(() => {
    if (timers.length === 0) return
    const first =
      Math.min(...timers.map((t) => t.endsAt)) + FINISHED_TIMER_KEPT_MS
    const id = window.setTimeout(
      () =>
        setTimers((ts) =>
          ts.filter((t) => t.endsAt + FINISHED_TIMER_KEPT_MS > Date.now()),
        ),
      Math.max(0, first - Date.now()),
    )
    return () => window.clearTimeout(id)
  }, [timers])

  const start = useCallback((stepKey: string, time: TimePiece) => {
    const timer = {
      id: nextId.current++,
      stepKey,
      time: time.time,
      label: time.text,
      seconds: time.seconds,
      endsAt: Date.now() + time.seconds * 1000,
    }
    setTimers((ts) => [...ts, timer])
  }, [])

  // Stopping a timer can be undone, since a tap with wet hands can miss.
  // Leaving the recipe takes the Undo with it.
  const undos = useRef(new Set<string>())
  useEffect(() => {
    const open = undos.current
    return () => {
      for (const id of open) toast.close(id)
    }
  }, [])
  const stop = useCallback((timer: Timer) => {
    setTimers((ts) => ts.filter((t) => t.id !== timer.id))
    const id: string = toast.add({
      title: m.recipe_timer_stopped({ time: timer.label }),
      actionProps: {
        children: m.editor_undo(),
        onClick: () => {
          toast.close(id)
          setTimers((ts) =>
            ts.some((t) => t.stepKey === timer.stepKey && t.time === timer.time)
              ? ts
              : [...ts, timer],
          )
        },
      },
      onClose: () => undos.current.delete(id),
    })
    undos.current.add(id)
  }, [])

  const stopAll = useCallback(() => setTimers([]), [])
  const find = (stepKey: string, time: number) =>
    timers.find((t) => t.stepKey === stepKey && t.time === time)
  return { timers, start, stop, stopAll, find }
}

export type Timers = ReturnType<typeof useTimers>

// Seconds left until `endsAt`, 0 once it's past, kept up to date in the
// component that shows them, as the clock's second changes.
export function useSecondsLeft(endsAt: number): number {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()))
  useEffect(() => {
    let id: number | undefined
    const tick = () => {
      const ms = Math.max(0, endsAt - Date.now())
      setLeft(ms)
      // A clock shows seconds rounded up, so its second changes on each
      // whole second left.
      if (ms > 0) id = window.setTimeout(tick, ((ms - 1) % 1000) + 1)
    }
    tick()
    return () => window.clearTimeout(id)
  }, [endsAt])
  return left / 1000
}

// Beeps every few seconds while a timer's time is up, until it's stopped
// or has beeped for long enough. A tap or key press in the page unlocks
// the alarm, so timers kept from before a reload beep too once the page
// has been touched. A touch unlocks it as it ends: browsers let a page make
// sound from a tap's end, not its start.
export function useAlarm(endsAt: ReadonlyArray<number>) {
  const [ringing, setRinging] = useState(false)
  // The times by value, so the check below starts again only when they
  // change, not with each new array of them.
  const key = endsAt.join()
  useEffect(() => {
    const ends = key === '' ? [] : key.split(',').map(Number)
    let id: number | undefined
    // Checked again whenever a timer starts or stops ringing.
    const check = () => {
      const now = Date.now()
      setRinging(ends.some((end) => isRinging(end, now)))
      const next = Math.min(
        ...ends
          .flatMap((end) => [end, end + ALARM_FOR_MS])
          .filter((at) => at > now),
      )
      if (next !== Infinity) id = window.setTimeout(check, next - now)
    }
    check()
    return () => window.clearTimeout(id)
  }, [key])

  useEffect(() => {
    const options = { capture: true, passive: true }
    document.addEventListener('pointerup', unlockAlarm, options)
    document.addEventListener('keydown', unlockAlarm, options)
    return () => {
      document.removeEventListener('pointerup', unlockAlarm, options)
      document.removeEventListener('keydown', unlockAlarm, options)
    }
  }, [])
  useEffect(() => {
    if (!ringing) return
    playAlarm()
    const id = window.setInterval(playAlarm, ALARM_EVERY_MS)
    return () => window.clearInterval(id)
  }, [ringing])
}

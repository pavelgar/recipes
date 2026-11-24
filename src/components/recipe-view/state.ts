import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import type { ReadSection } from '@/components/recipe-view/lines'
import type { TimePiece } from '@/core/recipe/read-step'
import type { Language } from '@/core/quantities'
import type {
  KeptTimer,
  UpdateProgress,
} from '@/components/recipe-view/recipe-progress'

// --- Servings ---

// The servings the recipe is shown for, starting from those kept, or the
// recipe's own. Servings with a number ("4 annosta") step from it and read
// with the number changed; servings without one change as a multiple of
// the recipe ("× 2").
export function useServings(
  written: string | null,
  language: Language | null,
  kept: number | null,
  update: UpdateProgress,
) {
  const base = servingsCount(written, language)
  const original = base ?? 1
  const count = kept ?? original
  const canScale = base === null || (Number.isFinite(base) && base > 0)
  const factor = !canScale ? 1 : base === null ? count : count / base
  const step = servingsStep(base)

  const times = `× ${formatCount(count, language)}`
  const label =
    !canScale && written
      ? written
      : !written
        ? times
        : base === null
          ? count === 1
            ? written
            : `${written} ${times}`
          : scaleServings(written, factor, language)

  const move = useCallback(
    (by: number) => {
      if (!canScale) return
      update((progress) => {
        const previous = progress.servings?.count ?? original
        const next = Math.max(step, previous + by)
        return {
          ...progress,
          servings: next === original ? null : { written, count: next },
        }
      })
    },
    [canScale, update, original, step, written],
  )

  return {
    label,
    factor,
    changed: factor !== 1,
    less: () => move(-step),
    more: () => move(step),
    canLess: canScale && count > step,
    canMore: canScale,
  }
}

export type Servings = ReturnType<typeof useServings>

// --- Crossing off ---

// Which lines are crossed off, ingredients and steps alike, by line key,
// starting from those kept.
export function useCrossOff(
  kept: ReadonlyArray<string>,
  update: UpdateProgress,
) {
  const done = useMemo(() => new Set(kept), [kept])
  const has = (key: string) => done.has(key)
  const toggle = (key: string) => {
    const checking = !has(key)
    update((progress) => ({
      ...progress,
      crossed: checking
        ? [...new Set([...progress.crossed, key])]
        : progress.crossed.filter((line) => line !== key),
    }))
  }
  const clear = (keys: ReadonlyArray<string>) => {
    const cleared = new Set(keys)
    update((progress) => ({
      ...progress,
      crossed: progress.crossed.filter((line) => !cleared.has(line)),
    }))
  }
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

export type Timer = KeptTimer & { id: string }

function closeUndos(ids: Set<string>) {
  const open = [...ids]
  ids.clear()
  for (const id of open) toast.close(id)
}

// Timers started from times in steps, starting from those kept, which ran
// on while the page was closed. Several can run at once. A timer goes once
// its time has long been up, unless it's stopped sooner.
export function useTimers(
  kept: ReadonlyArray<KeptTimer>,
  update: UpdateProgress,
) {
  const timers = useMemo(
    () =>
      kept.map((timer) => ({
        ...timer,
        id: `${timer.stepKey}:${timer.time}:${timer.endsAt}`,
      })),
    [kept],
  )

  useEffect(() => {
    if (timers.length === 0) return
    const first =
      Math.min(...timers.map((t) => t.endsAt)) + FINISHED_TIMER_KEPT_MS
    const id = window.setTimeout(
      () =>
        update((progress) => {
          const now = Date.now()
          return {
            ...progress,
            timers: progress.timers.filter(
              (t) => t.endsAt + FINISHED_TIMER_KEPT_MS > now,
            ),
          }
        }),
      Math.max(0, first - Date.now()),
    )
    return () => window.clearTimeout(id)
  }, [timers, update])

  const start = useCallback(
    (stepKey: string, time: TimePiece) => {
      const timer: KeptTimer = {
        stepKey,
        time: time.time,
        label: time.text,
        seconds: time.seconds,
        endsAt: Date.now() + time.seconds * 1000,
      }
      update((progress) =>
        progress.timers.some(
          (t) => t.stepKey === stepKey && t.time === time.time,
        )
          ? progress
          : { ...progress, timers: [...progress.timers, timer] },
      )
    },
    [update],
  )

  // Stopping a timer can be undone, since a tap with wet hands can miss.
  // Leaving the recipe takes the Undo with it.
  const undos = useRef(new Set<string>())
  useEffect(() => {
    const open = undos.current
    return () => closeUndos(open)
  }, [])
  const stop = useCallback(
    (timer: Timer) => {
      const removed = update((progress) => {
        const remaining = progress.timers.filter(
          (t) =>
            t.stepKey !== timer.stepKey ||
            t.time !== timer.time ||
            t.endsAt !== timer.endsAt,
        )
        return remaining.length === progress.timers.length
          ? progress
          : { ...progress, timers: remaining }
      })
      if (!removed) return
      const id: string = toast.add({
        title: m.recipe_timer_stopped({ time: timer.label }),
        actionProps: {
          children: m.editor_undo(),
          onClick: () => {
            if (!undos.current.delete(id)) return
            toast.close(id)
            const { id: _, ...keptTimer } = timer
            update((progress) =>
              progress.timers.some(
                (t) => t.stepKey === timer.stepKey && t.time === timer.time,
              )
                ? progress
                : { ...progress, timers: [...progress.timers, keptTimer] },
            )
          },
        },
        onClose: () => undos.current.delete(id),
      })
      undos.current.add(id)
    },
    [update],
  )

  const startOver = useCallback(
    (stepKeys: ReadonlyArray<string>) => {
      closeUndos(undos.current)
      const steps = new Set(stepKeys)
      update((progress) => ({
        ...progress,
        crossed: progress.crossed.filter((line) => !steps.has(line)),
        timers: [],
      }))
    },
    [update],
  )
  const find = (stepKey: string, time: number) =>
    timers.find((t) => t.stepKey === stepKey && t.time === time)
  return { timers, start, stop, startOver, find }
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
  const [ringing, setRinging] = useState<ReadonlySet<number>>(() => new Set())
  // The times by value, so the check below starts again only when they
  // change, not with each new array of them.
  const key = endsAt.join()
  useEffect(() => {
    const ends = key === '' ? [] : key.split(',').map(Number)
    let id: number | undefined
    // Checked again whenever a timer starts or stops ringing.
    const check = () => {
      const now = Date.now()
      setRinging(new Set(ends.filter((end) => isRinging(end, now))))
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
  const sounding = ringing.size > 0
  useEffect(() => {
    if (!sounding) return
    playAlarm()
    const id = window.setInterval(playAlarm, ALARM_EVERY_MS)
    return () => window.clearInterval(id)
  }, [sounding])
  return ringing
}

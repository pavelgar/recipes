import { lineKeys } from '@/core/recipe/line-keys'
import { z } from 'zod'
import type { ReadSection } from '@/components/recipe-view/lines'
import type { Section } from '@/core/recipe/section'

// How far someone has got with a recipe on this device: the servings they
// chose, the lines crossed off and the timers running. Each recipe's is
// kept under its own key, so any number of recipes keep theirs, and a
// recipe back as it started keeps nothing. Lines are crossed off by their
// text, so progress on a line since changed is dropped and the rest stays.

const KEY_PREFIX = 'recipes.progress.v1.'

// How long a timer stays once its time is up, unless it's stopped sooner.
export const FINISHED_TIMER_KEPT_MS = 12 * 60 * 60 * 1000

const timerShape = z.object({
  // The step it was started from, by its line's key, and which of the
  // times in the step, counting from 0.
  stepKey: z.string(),
  time: z.int().nonnegative(),
  // The time as the step writes it, and how long it was, in seconds.
  label: z.string(),
  seconds: z.int().positive(),
  // When it's up, in milliseconds since the epoch, so a timer keeps running
  // while the page is closed.
  endsAt: z.int().positive(),
})

// The count shown, or the multiplier for a yield without a count, and the
// original yield it was chosen for.
const servingsShape = z.object({
  written: z.string().nullable(),
  count: z.number().positive(),
})

const progressShape = z.object({
  servings: servingsShape.nullable().catch(null),
  crossed: z.array(z.string().nullable().catch(null)).catch([]),
  timers: z.array(timerShape.nullable().catch(null)).catch([]),
})

export type KeptTimer = z.infer<typeof timerShape>
export type Progress = {
  servings: z.infer<typeof servingsShape> | null
  crossed: Array<string>
  timers: Array<KeptTimer>
}

type Lines = {
  servings: string | null
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Pick<ReadSection, 'lines'>>
}

const isEmpty = (progress: Progress) =>
  progress.servings === null &&
  progress.crossed.length === 0 &&
  progress.timers.length === 0

// The progress kept for the recipe as it is now: on lines it still has,
// for the servings it still gives, and with timers not long up.
export function loadProgress(
  recipeId: number,
  lines: Lines,
  now = Date.now(),
): Progress | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + recipeId)
    if (raw === null) return null
    const parsed = progressShape.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    const { servings, crossed, timers } = parsed.data
    const steps = new Map(
      lines.steps.flatMap((section) =>
        section.lines.map((line) => [line.key, line]),
      ),
    )
    const keys = new Set([
      ...lineKeys(lines.ingredients, 'ingredient').flat(),
      ...steps.keys(),
    ])
    const active = new Map<string, KeptTimer>()
    for (const timer of timers) {
      if (!timer || timer.endsAt + FINISHED_TIMER_KEPT_MS <= now) continue
      const times = steps.get(timer.stepKey)?.pieces
      const time = times?.find(
        (piece) => piece.kind === 'time' && piece.time === timer.time,
      )
      if (
        time?.kind !== 'time' ||
        time.text !== timer.label ||
        time.seconds !== timer.seconds
      )
        continue
      active.set(`${timer.stepKey}:${timer.time}`, timer)
    }
    return {
      servings: servings?.written === lines.servings ? servings : null,
      crossed: crossed.filter(
        (key): key is string => key !== null && keys.has(key),
      ),
      timers: [...active.values()],
    }
  } catch {
    return null
  }
}

export function saveProgress(recipeId: number, progress: Progress) {
  try {
    if (isEmpty(progress)) localStorage.removeItem(KEY_PREFIX + recipeId)
    else localStorage.setItem(KEY_PREFIX + recipeId, JSON.stringify(progress))
  } catch {
    // Storage full or blocked: progress lives only in the open page.
  }
}

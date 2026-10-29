import { z } from 'zod'
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
  time: z.number(),
  // The time as the step writes it, and how long it was, in seconds.
  label: z.string(),
  seconds: z.number(),
  // When it's up, in milliseconds since the epoch, so a timer keeps running
  // while the page is closed.
  endsAt: z.number(),
})

const progressShape = z.object({
  // The servings chosen: the count shown, or the multiple of a recipe whose
  // servings give no number, and the servings as written it was chosen
  // for. Null for the recipe's own.
  servings: z
    .object({ written: z.string().nullable(), count: z.number() })
    .nullable(),
  crossed: z.array(z.string()),
  timers: z.array(timerShape),
})

export type KeptTimer = z.infer<typeof timerShape>
export type Progress = z.infer<typeof progressShape>

type Lines = {
  servings: string | null
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Section>
}

// A short fingerprint of a line's text (FNV-1a).
function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

// Each line's key, for crossing it off: its text, and which line with that
// text it is, since a recipe can give one twice ("1 tl suolaa").
export function lineKeys(
  sections: ReadonlyArray<Section>,
  kind: 'ingredient' | 'step',
): Array<Array<string>> {
  const seen = new Map<string, number>()
  return sections.map((section) =>
    section.lines.map((line) => {
      const text = fingerprint(line)
      const repeat = seen.get(text) ?? 0
      seen.set(text, repeat + 1)
      return `${kind}-${text}-${repeat}`
    }),
  )
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
    const steps = new Set(lineKeys(lines.steps, 'step').flat())
    const keys = new Set([
      ...lineKeys(lines.ingredients, 'ingredient').flat(),
      ...steps,
    ])
    return {
      servings: servings?.written === lines.servings ? servings : null,
      crossed: crossed.filter((key) => keys.has(key)),
      timers: timers.filter(
        (timer) =>
          steps.has(timer.stepKey) &&
          timer.endsAt + FINISHED_TIMER_KEPT_MS > now,
      ),
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

import { useMemo } from 'react'
import { useDisplaySystem } from '@/hooks/use-display-system'
import { rulesFor } from '@/core/languages'
import {
  parseIngredient,
  presentIngredient,
  presentStep,
  scanStep,
} from '@/core/quantities'
import { lineKeys } from '@/components/recipe-view/recipe-progress'
import { splitTimes } from '@/core/step-times'
import type { Section } from '@/core/recipe/section'
import type { RecipeLanguage } from '@/core/languages'
import type { Language, MeasuringSystem, Segment } from '@/core/quantities'

// A time a step mentions, for starting a timer from it: which of the
// step's times it is, counting from 0, as it's written and how long.
export type TimePiece = {
  readonly kind: 'time'
  readonly time: number
  readonly text: string
  readonly seconds: number
}

export type Piece = Segment | TimePiece

export type Line = {
  // Its text's, for crossing the line off (recipe-progress.ts).
  key: string
  // The line as shown: converted to the device's units, ingredients scaled
  // to the servings, and steps with the times they mention.
  pieces: ReadonlyArray<Piece>
  // Which of a step's quantities are amounts, by index, as opposed to
  // temperatures, sizes and lengths, which servings don't touch.
  amounts: ReadonlySet<number>
}

export type ReadSection = {
  key: string
  heading: string | null
  lines: ReadonlyArray<Line>
}

type Readable = {
  language: RecipeLanguage
  measuringSystem: MeasuringSystem
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Section>
}

const NO_AMOUNTS: ReadonlySet<number> = new Set()

// Each section's lines, read by `read`, with their keys.
function readSections<T extends object>(
  sections: ReadonlyArray<Section>,
  kind: 'ingredient' | 'step',
  read: (written: string) => T,
) {
  const keys = lineKeys(sections, kind)
  return sections.map((section, s) => ({
    key: `${kind}-${s}`,
    heading: section.heading,
    lines: section.lines.map((written, l) => ({
      key: keys[s][l],
      ...read(written),
    })),
  }))
}

// A step's text split at the times it mentions, numbered through the step.
function withTimes(
  segments: ReadonlyArray<Segment>,
  language: Language,
): Array<Piece> {
  let time = 0
  return segments.flatMap((segment): Array<Piece> => {
    if (segment.kind !== 'text') return [segment]
    return splitTimes(segment.text, language).map((part) =>
      typeof part === 'string'
        ? { kind: 'text', text: part }
        : { kind: 'time', time: time++, ...part },
    )
  })
}

const asWritten = (written: string): ReadonlyArray<Piece> => [
  { kind: 'text', text: written },
]

// A recipe's lines as this device shows them. A recipe in a language the
// app doesn't read quantities in is shown as written. Lines are read once
// for the recipe; servings only change how its ingredients are shown.
export function useRecipeLines(recipe: Readable, factor: number) {
  const display = useDisplaySystem()
  const language = rulesFor(recipe.language)
  const system = recipe.measuringSystem

  const parsed = useMemo(
    () =>
      readSections(recipe.ingredients, 'ingredient', (written) => ({
        written,
        parsed:
          language === null
            ? null
            : parseIngredient(written, { language, system }),
      })),
    [recipe.ingredients, language, system],
  )
  const ingredients = useMemo(
    (): ReadonlyArray<ReadSection> =>
      parsed.map((section) => ({
        ...section,
        lines: section.lines.map(({ key, written, parsed: line }) => ({
          key,
          pieces:
            language === null || line === null
              ? asWritten(written)
              : presentIngredient(line, { language, system, display, factor })
                  .segments,
          amounts: NO_AMOUNTS,
        })),
      })),
    [parsed, language, system, display, factor],
  )
  const steps = useMemo(
    (): ReadonlyArray<ReadSection> =>
      readSections(recipe.steps, 'step', (written) => {
        if (language === null) {
          return { pieces: asWritten(written), amounts: NO_AMOUNTS }
        }
        const quantities = scanStep(written, { language, system })
        const { segments } = presentStep(written, quantities, {
          language,
          system,
          display,
        })
        const amounts = new Set(
          quantities.flatMap((q, i) =>
            q.type === 'amount' && q.unit?.kind !== 'length' ? [i] : [],
          ),
        )
        return { pieces: withTimes(segments, language), amounts }
      }),
    [recipe.steps, language, system, display],
  )
  return { ingredients, steps }
}

import { presentStep, scanStep } from '@/core/quantities'
import { splitTimes } from '@/core/step-times'
import type {
  DisplaySystem,
  Language,
  MeasuringSystem,
  Segment,
} from '@/core/quantities'

// A time a step mentions, for starting a timer from it: which of the
// step's times it is, counting from 0, as it's written and how long.
export type TimePiece = {
  readonly kind: 'time'
  readonly time: number
  readonly text: string
  readonly seconds: number
}

export type Piece = Segment | TimePiece

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

const NO_AMOUNTS: ReadonlySet<number> = new Set()

// The step as displayed, with its quantities and the times that can start timers.
export function readStep(
  written: string,
  language: Language | null,
  system: MeasuringSystem,
  display: DisplaySystem,
): { pieces: ReadonlyArray<Piece>; amounts: ReadonlySet<number> } {
  if (language === null) {
    return { pieces: [{ kind: 'text', text: written }], amounts: NO_AMOUNTS }
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
}

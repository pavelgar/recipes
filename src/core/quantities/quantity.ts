import { isBareIn, spacedInchesHold } from '@/core/quantities/ambiguity'
import {
  atNumberBoundary,
  makeRange,
  readNumber,
  readNumberWord,
  readRangeSeparator,
} from '@/core/quantities/numbers'
import { endOf, matchAt } from '@/core/quantities/text'
import { readUnit, unitById } from '@/core/quantities/units'
import type { Language, NumberForm, Value } from '@/core/quantities/numbers'
import type { Unit, UnitMatch } from '@/core/quantities/units'

export type Span = readonly [start: number, end: number]

// One number as written in the text.
export type WrittenNumber = {
  readonly value: number
  readonly at: Span
  readonly form: NumberForm
}

// What the text says about an amount, and where. To scale an amount and
// keep the writer's style, replace the numbers and leave the rest; to
// convert it, replace everything from the first number to the unit.
export type Amount = {
  readonly value: Value
  readonly unit: Unit | null
  readonly approximate: boolean
  // From the first number to the unit. When the amount takes its unit from
  // the amount after it ("2 + 1 rkl"), only the number, and unitAt points
  // past it.
  readonly at: Span
  // One number, or both ends of a range. "1lb 5oz" is one number in pounds
  // whose unit covers "lb 5oz".
  readonly numbers: ReadonlyArray<WrittenNumber>
  // The unit as written. When a range writes it twice ("198g to 255g"), the
  // second.
  readonly unitAt: Span | null
}

export type ReadOptions = { readonly language: Language }

// An amount read at a position, before anything is known about its role.
export type QuantityMatch = {
  readonly value: Value
  readonly unit: Unit | null
  readonly start: number
  readonly end: number
  readonly numbers: ReadonlyArray<WrittenNumber>
  readonly unitAt: Span | null
  // A word between the number and the unit makes it so: "2 scant cups".
  readonly approximate?: boolean
}

const SPACES = / */y
const NUMBER_HYPHEN = /-/y

// A number read, as the quantities record it.
export const written = (n: {
  value: number
  start: number
  end: number
  form: NumberForm
}): WrittenNumber => ({ value: n.value, at: [n.start, n.end], form: n.form })

// Words between a number and a spoon, cup or handful: "1/4 rounded
// teaspoon", "2 scant cups", "1 large tbsp". All but "level" make the amount
// approximate.
const MODIFIER = new RegExp(
  String.raw` +(?:(level|tasai\p{L}*)|heaped|heaping|scant|rounded|generous|good|large|small|big|kukkura\p{L}*)(?![\p{L}])`,
  'iuy',
)

// Words for the size of a package or piece, between the number and its
// unit: "1 pieni tlk", "1 medium head". They say which package or piece,
// so the amount stays exact.
const SIZE = new RegExp(
  String.raw` +(?:small|medium|large|big|pien\p{L}*|iso\p{L}*|suur\p{L}*)(?![\p{L}])`,
  'iuy',
)

type ModifiedUnit = UnitMatch & { readonly approximate: boolean }

// Reads a unit after a word such as "heaped" or "pieni" at pos.
function readModifiedUnit(
  text: string,
  pos: number,
  opts: ReadOptions,
): ModifiedUnit | null {
  const m = matchAt(MODIFIER, text, pos)
  const unit = m ? readUnitAfter(text, pos + m[0].length, opts) : null
  if (m && (unit?.unit.kind === 'volume' || unit?.unit.kind === 'pinch')) {
    return { ...unit, approximate: m.at(1) === undefined }
  }
  const size = matchAt(SIZE, text, pos)
  const sized = size ? readUnitAfter(text, pos + size[0].length, opts) : null
  if (sized?.unit.kind !== 'package' && sized?.unit.kind !== 'count') {
    return null
  }
  return { ...sized, approximate: false }
}

function readUnitOrModified(
  text: string,
  pos: number,
  opts: ReadOptions,
): (UnitMatch & { readonly approximate?: boolean }) | null {
  return readUnitAfter(text, pos, opts) ?? readModifiedUnit(text, pos, opts)
}

export function readUnitAfter(
  text: string,
  pos: number,
  opts: ReadOptions,
): UnitMatch | null {
  let p = endOf(SPACES, text, pos) ?? pos
  const spaced = p > pos
  // "9-inch pan", "14-ounce can"
  p = endOf(NUMBER_HYPHEN, text, p) ?? p
  const match = readUnit(text, p, opts.language)
  if (!match) return null
  if (match.unit.id === 'in' && spaced && !spacedInchesHold(text, match)) {
    return null
  }
  return match
}

// Reads a number or range with an optional unit: "2", "1,5 dl", "2–3 tbsp",
// "350 - 400g", "198g to 255g", "1lb 5oz". A number followed by % is not an
// amount.
export function readQuantity(
  text: string,
  pos: number,
  opts: ReadOptions,
): QuantityMatch | null {
  const first = readNumber(text, pos, opts.language)
  if (!first) return null
  const firstUnit = readUnitOrModified(text, first.end, opts)
  const firstEnd = firstUnit?.end ?? first.end

  const separatorEnd = readRangeSeparator(text, firstEnd)
  if (separatorEnd !== null) {
    const second = readNumber(text, separatorEnd, opts.language)
    if (second) {
      const secondUnit = readUnitOrModified(text, second.end, opts)
      const range = makeRange(first.value, second.value)
      const unitsAgree = !firstUnit || secondUnit?.unit.id === firstUnit.unit.id
      if (range && unitsAgree) {
        const unit = secondUnit ?? firstUnit
        return {
          value: range,
          unit: unit?.unit ?? null,
          start: pos,
          end: secondUnit?.end ?? second.end,
          numbers: [written(first), written(second)],
          unitAt: unit ? [unit.start, unit.end] : null,
          approximate: unit?.approximate,
        }
      }
    }
  }

  if (!firstUnit && text[endOf(SPACES, text, first.end) ?? first.end] === '%') {
    return null
  }
  // "1lb 5oz" reads as 1 5/16 lb.
  if (firstUnit?.unit.id === 'lb') {
    const ouncesAt = endOf(SPACES, text, firstUnit.end) ?? firstUnit.end
    const ounces =
      ouncesAt > firstUnit.end
        ? readNumber(text, ouncesAt, opts.language)
        : null
    const ouncesUnit = ounces ? readUnitAfter(text, ounces.end, opts) : null
    if (ounces && ouncesUnit?.unit.id === 'oz') {
      return {
        value: first.value + ounces.value / 16,
        unit: firstUnit.unit,
        start: pos,
        end: ouncesUnit.end,
        numbers: [written(first)],
        unitAt: [firstUnit.start, ouncesUnit.end],
      }
    }
  }
  return {
    value: first.value,
    unit: firstUnit?.unit ?? null,
    start: pos,
    end: firstEnd,
    numbers: [written(first)],
    unitAt: firstUnit ? [firstUnit.start, firstUnit.end] : null,
    approximate: firstUnit?.approximate,
  }
}

// Finnish unit words that mean one of themselves: "litra maitoa",
// "teelusikallinen suolaa".
const ONE_OF =
  /(?:litra|desilitra|kilo|teelusikallinen|ruokalusikallinen|maustemitallinen)(?![\p{L}\d])/iuy

export type WordQuantityMatch = QuantityMatch & {
  // Written with "a" or "an", which only count as one before a unit.
  readonly article: boolean
  // No space or hyphen between the word and the unit.
  readonly glued: boolean
}

// Reads an amount written in words: "kaksi desilitraa", "one and a half
// cups", "a pinch", "teelusikallinen".
export function readWordQuantity(
  text: string,
  pos: number,
  opts: ReadOptions,
): WordQuantityMatch | null {
  const word = readNumberWord(text, pos, opts.language)
  if (word) {
    const found = readUnitAfter(text, word.end, opts)
    // After a number word, "in" is the preposition: "two in the drumsticks".
    const unit = found && !isBareIn(text, found) ? found : null
    return {
      value: word.value,
      unit: unit?.unit ?? null,
      start: pos,
      end: unit?.end ?? word.end,
      numbers: [written(word)],
      unitAt: unit ? [unit.start, unit.end] : null,
      article: word.article,
      glued: unit?.start === word.end,
    }
  }
  if (opts.language !== 'fi' || !atNumberBoundary(text, pos)) return null
  const end = endOf(ONE_OF, text, pos)
  const unit = end === null ? null : readUnitAfter(text, pos, opts)
  if (end === null || !unit) return null
  return {
    value: 1,
    unit: unit.unit,
    start: pos,
    end,
    // The word is both the number and the unit.
    numbers: [{ value: 1, at: [pos, end], form: 'word' }],
    unitAt: [pos, end],
    article: false,
    glued: false,
  }
}

export function toAmount(q: QuantityMatch, approximate: boolean): Amount {
  return {
    value: q.value,
    unit: q.unit,
    approximate: approximate || q.approximate === true,
    at: [q.start, q.end],
    numbers: q.numbers,
    unitAt: q.unitAt,
  }
}

export const MAUSTEMITTA = unitById('maustemitta')

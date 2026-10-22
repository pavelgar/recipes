import {
  makeRange,
  readNumber,
  readRangeSeparator,
} from '@/lib/quantities/numbers'
import { isMeasure, readUnit } from '@/lib/quantities/units'
import type { Language, Value } from '@/lib/quantities/numbers'
import type { Unit, UnitContext } from '@/lib/quantities/units'

export type Span = readonly [start: number, end: number]

export type Amount = {
  readonly value: Value
  readonly unit: Unit | null
  readonly approximate: boolean
  // Everything the amount covers in the text, from the first number to the
  // unit.
  readonly at: Span
  // The number, or both numbers of a range. When a range writes its unit
  // twice ("198g to 255g"), the first unit falls inside.
  readonly valueAt: Span
  readonly unitAt: Span | null
  // The same amount written in another unit right after it: "125g/4½oz",
  // "1 cup (240 ml)".
  readonly alt: Amount | null
}

export type ReadOptions = {
  readonly language: Language
  readonly context: UnitContext
  // Step text joins numbers and units with hyphens: "9-inch pan".
  readonly hyphens: boolean
}

export type QuantityMatch = {
  readonly value: Value
  readonly unit: Unit | null
  readonly start: number
  readonly end: number
  readonly valueEnd: number
  readonly unitAt: Span | null
}

const SPACE = /[ \t\u00a0\u2009\u202f]*/y

function after(re: RegExp, text: string, pos: number): number | null {
  re.lastIndex = pos
  const m = re.exec(text)
  return m ? pos + m[0].length : null
}

export function readUnitAfter(text: string, pos: number, opts: ReadOptions) {
  let p = after(SPACE, text, pos) ?? pos
  const spaced = p > pos
  if (opts.hyphens && text[p] === '-') p++
  const match = readUnit(text, p, opts.context)
  if (!match) return null
  // Inch marks only count glued to the number: 1/3" wide.
  if (match.unit.id === 'in' && spaced && /["″”]/.test(text[p])) return null
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
  const firstUnit = readUnitAfter(text, first.end, opts)
  const firstEnd = firstUnit?.end ?? first.end

  const separatorEnd = readRangeSeparator(text, firstEnd)
  if (separatorEnd !== null) {
    const second = readNumber(text, separatorEnd, opts.language)
    if (second) {
      const secondUnit = readUnitAfter(text, second.end, opts)
      const range = makeRange(first.value, second.value)
      const unitsAgree = !firstUnit || secondUnit?.unit.id === firstUnit.unit.id
      if (range && unitsAgree) {
        const unit = secondUnit ?? firstUnit
        return {
          value: range,
          unit: unit?.unit ?? null,
          start: pos,
          end: secondUnit?.end ?? second.end,
          valueEnd: second.end,
          unitAt: unit ? [unit.start, unit.end] : null,
        }
      }
    }
  }

  if (!firstUnit && text[after(SPACE, text, first.end) ?? first.end] === '%') {
    return null
  }
  // "1lb 5oz" reads as 1 5/16 lb.
  if (firstUnit?.unit.id === 'lb') {
    const ouncesAt = after(SPACE, text, firstUnit.end) ?? firstUnit.end
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
        valueEnd: first.end,
        unitAt: [firstUnit.start, ouncesUnit.end],
      }
    }
  }
  return {
    value: first.value,
    unit: firstUnit?.unit ?? null,
    start: pos,
    end: firstEnd,
    valueEnd: first.end,
    unitAt: firstUnit ? [firstUnit.start, firstUnit.end] : null,
  }
}

export function toAmount(
  q: QuantityMatch,
  approximate: boolean,
  alt: Amount | null = null,
): Amount {
  return {
    value: q.value,
    unit: q.unit,
    approximate,
    at: [q.start, q.end],
    valueAt: [q.start, q.valueEnd],
    unitAt: q.unitAt,
    alt,
  }
}

const SLASH = /\s*\/\s*/y

// Reads what follows a slash after an amount: "/4½oz", "/ 2 sticks".
export function readSlashed(
  text: string,
  pos: number,
  opts: ReadOptions,
): QuantityMatch | null {
  const p = after(SLASH, text, pos)
  return p === null ? null : readQuantity(text, p, opts)
}

// Reads "/4½oz" after an amount: the same amount in another measure.
export function readSlashAlt(
  text: string,
  pos: number,
  unit: Unit | null,
  opts: ReadOptions,
): Amount | null {
  const q = readSlashed(text, pos, opts)
  if (!q || !isMeasure(q.unit) || q.unit?.id === unit?.id) return null
  return toAmount(q, false)
}

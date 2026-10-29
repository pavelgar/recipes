import { expect } from 'vitest'
import { unitOf } from '@/core/quantities/scan'
import { canonical } from '@/core/quantities/text'
import { isMeasure, readUnit } from '@/core/quantities/units'
import type { ParsedIngredient } from '@/core/quantities/ingredient'
import type { LineQuantity } from '@/core/quantities/line'
import type { Language, Value } from '@/core/quantities/numbers'
import type { Quantity } from '@/core/quantities/scan'

// Short descriptions of parse results, so tests and the ledger read as a
// table: "counted 1 pss | total 350 g  [1 ps] [350 g]".
//
// - The first word is the line's result, then its main amount.
// - "~" marks an approximate amount, "?" a temperature scale taken from the
//   measuring system, "both" a temperature already given in °C and °F.
// - "= …" is the same amount in another measure, right after its owner.
// - "| each", "| total" and "| same" belong to the quantity before them.
// - "| more" is any other quantity on the line; "more fixed" doesn't scale.
// - Last, in brackets, the text each quantity covers, in list order.

const round = (n: number) => String(Math.round(n * 1000) / 1000)

export function describeValue(value: Value): string {
  return typeof value === 'number'
    ? round(value)
    : `${round(value.min)}-${round(value.max)}`
}

export function describeQuantity(q: Quantity): string {
  const approx = q.approximate ? '~' : ''
  switch (q.type) {
    case 'temperature':
      return `${approx}${describeValue(q.value)} ${q.scaleWritten ? '' : '?'}°${q.scale}${q.bothGiven ? ' both' : ''}`
    case 'dimensions':
      return `${approx}${q.values.map(round).join('x')} ${q.unit.id}`
    case 'amount': {
      const unit = q.unit ? ` ${q.unit.id}` : ''
      return `${approx}${describeValue(q.value)}${unit}`
    }
  }
}

// Whether q restates its owner in another measure: "4½oz" in "125g/4½oz".
function isRestated(list: ReadonlyArray<LineQuantity>, q: LineQuantity) {
  return (
    q.role === 'same' &&
    q.of !== null &&
    q.type !== 'temperature' &&
    isMeasure(unitOf(q)) &&
    isMeasure(unitOf(list[q.of]))
  )
}

// One quantity with the amounts that restate it: "125 g = 4.5 oz".
function withRestated(list: ReadonlyArray<LineQuantity>, i: number): string {
  const restated = list
    .map((q, j) => (q.of === i && isRestated(list, q) ? j : -1))
    .filter((j) => j !== -1)
    .map((j) => ` = ${withRestated(list, j)}`)
  return `${describeQuantity(list[i])}${restated.join('')}`
}

// The text each quantity covers: "[2 pkt] [170 g]".
export function showSpans(
  text: string,
  spans: ReadonlyArray<readonly [number, number]>,
): string {
  return spans.map(([start, end]) => `[${text.slice(start, end)}]`).join(' ')
}

function describeList(list: ReadonlyArray<LineQuantity>): Array<string> {
  return list.flatMap((q, i) => {
    if (q.role === 'main' || isRestated(list, q)) return []
    const label =
      q.role === 'other' ? `more${q.scales ? '' : ' fixed'}` : q.role
    return [`${label} ${withRestated(list, i)}`]
  })
}

export function describeIngredient(parsed: ParsedIngredient): string {
  const list = parsed.quantities
  const main = list.findIndex((q) => q.role === 'main')
  const head =
    main === -1 ? parsed.result : `${parsed.result} ${withRestated(list, main)}`
  const parts = [head, ...describeList(list)].join(' | ')
  const spans = showSpans(
    parsed.text,
    list.map((q) => q.at),
  )
  return spans ? `${parts}  ${spans}` : parts
}

// A step's quantities, one per line: "180 °C both  [180C]".
export function describeStep(
  text: string,
  list: ReadonlyArray<LineQuantity>,
): Array<string> {
  return list.flatMap((q, i) => {
    if (isRestated(list, q)) return []
    const restated = list.filter((r) => r.of === i && isRestated(list, r))
    const spans = showSpans(text, [q.at, ...restated.map((r) => r.at)])
    return [`${withRestated(list, i)}  ${spans}`]
  })
}

// That a line's quantities fit its text: non-empty spans inside it,
// numbers inside their quantity, links pointing back, and each unit the one
// written where its span says.
export function checkShape(
  line: { readonly text: string; readonly language: Language },
  list: ReadonlyArray<LineQuantity>,
) {
  const n = line.text.length
  list.forEach((q, i) => {
    const where = `${JSON.stringify(line.text)} #${i}`
    expect(q.at[0], where).toBeGreaterThanOrEqual(0)
    expect(q.at[1], where).toBeLessThanOrEqual(n)
    expect(q.at[0], where).toBeLessThan(q.at[1])
    for (const number of q.numbers) {
      expect(number.at[0], where).toBeGreaterThanOrEqual(q.at[0])
      expect(number.at[1], where).toBeLessThanOrEqual(q.at[1])
    }
    // Links point back, so a list can be read in one pass.
    if (q.of !== null) expect(q.of, where).toBeLessThan(i)
    if (q.type !== 'temperature' && q.unitAt && q.unit) {
      const text = canonical(line.text)
      const written = readUnit(text, q.unitAt[0], line.language)
      // "mm" reads as millimetres and becomes maustemitta in its line.
      if (q.unit.id !== 'maustemitta') {
        expect(written?.unit.id, where).toBe(q.unit.id)
      }
    }
  })
}

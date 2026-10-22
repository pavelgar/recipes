import {
  articleCounts,
  countsItems,
  isTurn,
  scaleLetterIsTemperature,
} from '@/lib/quantities/ambiguity'
import {
  approximateBefore,
  atNumberBoundary,
  makeRange,
  NUMBER_START,
  readApproximately,
  readNumber,
  readRangeSeparator,
} from '@/lib/quantities/numbers'
import {
  readQuantity,
  readUnitAfter,
  readWordQuantity,
  toAmount,
} from '@/lib/quantities/quantity'
import {
  DEGREE,
  endOf,
  matchAt,
  MINUS,
  skipSpace,
  TIMES,
  textBefore,
} from '@/lib/quantities/text'
import { isMeasure } from '@/lib/quantities/units'
import type { Language, Value } from '@/lib/quantities/numbers'
import type {
  Amount,
  QuantityMatch,
  ReadOptions,
  Span,
  WrittenNumber,
} from '@/lib/quantities/quantity'
import type { Unit } from '@/lib/quantities/units'

// Pass 1: finds every quantity in a text and how the text attaches it to
// the one before, without deciding what it means for the recipe. That is
// pass 2's job (ingredient.ts and steps.ts).

export type MeasuringSystem = 'us' | 'british' | 'australian' | 'metric'

export type Temperature = {
  readonly value: Value
  readonly approximate: boolean
  readonly scale: 'C' | 'F'
  // False when the text gives no scale ("220°", "350 degrees") and it was
  // taken from the measuring system: °F for US recipes, °C for the rest.
  readonly scaleWritten: boolean
  // The text already gives both °C and °F side by side, so it stays as
  // written: "375 degrees F (190 degrees C)", "180C/350F".
  readonly bothGiven: boolean
  readonly at: Span
  readonly numbers: ReadonlyArray<WrittenNumber>
}

export type Dimensions = {
  readonly values: ReadonlyArray<number>
  readonly approximate: boolean
  // Written after the values, or after the next size when the two share it:
  // "8x8x2 or 9x9x2 inches".
  readonly unit: Unit
  readonly at: Span
  readonly numbers: ReadonlyArray<WrittenNumber>
  readonly unitAt: Span | null
}

export type Quantity =
  | ({ readonly type: 'amount' } & Amount)
  | ({ readonly type: 'temperature' } & Temperature)
  | ({ readonly type: 'dimensions' } & Dimensions)

export type ScanOptions = {
  readonly language: Language
  readonly system: MeasuringSystem
}

// How the text attaches a quantity to an earlier one.
export type Link = {
  readonly to: number
  readonly by:
    // After a slash: "125g/4½oz", "250g / 2 sticks", "23x28cm/9x11in".
    | 'slash'
    // In parentheses right after it: "2 2/3 cups (320g)", "1 prk (400 g)".
    | 'paren'
    // Between a count and its package: "2 x 150g cartons", "2 14.5-ounce
    // cans", "1 (14 ounce) can".
    | 'size'
}

// Words that say whose size an amount is: "à" and "each" for one piece,
// "yht." and "total" for all of them. "(4 x 100 g)" is marked each, too.
export type Mark = 'each' | 'total' | null

export type Read = Quantity & {
  readonly link: Link | null
  readonly mark: Mark
  // The parentheses it fills on its own, apart from marks and words such
  // as "about": "(350 g)", "(à 170 g)", "(8 ounces each)".
  readonly paren: Span | null
  // Read at the start of an ingredient line, where "mm" is maustemitta and
  // number words such as "puolikas" count.
  readonly leading: boolean
}

const read = (
  q: Quantity,
  extra: Partial<Pick<Read, 'link' | 'mark' | 'paren' | 'leading'>> = {},
): Read => ({
  link: null,
  mark: null,
  paren: null,
  leading: false,
  ...q,
  ...extra,
})

export function amountOf(q: QuantityMatch, approximate = false): Quantity {
  return { type: 'amount', ...toAmount(q, approximate) }
}

// --- Temperatures ---

const DEGREE_SIGN = new RegExp(
  String.raw`[ \u00a0]?${DEGREE}(?:[ \u00a0]?([CF])(?![\p{L}]))?`,
  'uy',
)
const DEGREE_CHAR = /[ \u00a0]?([℃℉])/y
const SCALE_LETTER = /[ \u00a0]?([CF])(?![\p{L}\d])/uy
const DEGREES =
  /\s*degrees?(?![\p{L}])(?:\s+(F|C|Fahrenheit|Celsius)(?![\p{L}]))?/iuy
const ASTE = /\s*-?\s*aste\p{L}*/iuy

type Scale = { scale: 'C' | 'F' | null; end: number }

// Reads what makes a number a temperature: "°C", "℉", "F", "degrees",
// "asteessa".
function readScale(text: string, pos: number, value: number): Scale | null {
  let m = matchAt(DEGREE_SIGN, text, pos)
  if (m) {
    return {
      scale: (m[1] as 'C' | 'F' | undefined) ?? null,
      end: pos + m[0].length,
    }
  }
  m = matchAt(DEGREE_CHAR, text, pos)
  if (m) return { scale: m[1] === '℃' ? 'C' : 'F', end: pos + m[0].length }
  m = matchAt(SCALE_LETTER, text, pos)
  if (m && scaleLetterIsTemperature(value)) {
    return { scale: m[1] as 'C' | 'F', end: pos + m[0].length }
  }
  m = matchAt(DEGREES, text, pos)
  if (m) {
    const word = m[1] ? m[1].toUpperCase() : null
    const scale = word ? (word.startsWith('F') ? 'F' : 'C') : null
    return { scale, end: pos + m[0].length }
  }
  // Finnish degrees are always Celsius: "200 asteessa", "225-asteisessa".
  m = matchAt(ASTE, text, pos)
  if (m) return { scale: 'C', end: pos + m[0].length }
  return null
}

// A minus sign before a temperature: "-18 °C", "pakastimeen –18 asteeseen".
// After another number it's a range instead: "5 -18".
const MINUS_BEFORE = new RegExp(String.raw`(?:^|[^\d\s])\s*${MINUS}$`)

const written = (n: {
  value: number
  start: number
  end: number
  form: WrittenNumber['form']
}): WrittenNumber => ({ value: n.value, at: [n.start, n.end], form: n.form })

function readTemperature(
  text: string,
  pos: number,
  opts: ScanOptions,
): Quantity | null {
  const first = readNumber(text, pos, opts.language)
  if (!first) return null
  const negative = MINUS_BEFORE.test(textBefore(text, pos))
  const start = negative ? pos - 1 : pos
  const low = negative ? -first.value : first.value
  const numbers = [written(first)]

  let value: Value = low
  let suffix = readScale(text, first.end, low)
  // "180-200°C", "105° to 115°F", "350°F to 375°F"
  const separatorEnd = readRangeSeparator(text, suffix?.end ?? first.end)
  const second =
    separatorEnd === null ? null : readNumber(text, separatorEnd, opts.language)
  const range = second ? makeRange(low, second.value) : null
  const secondSuffix = second && range ? readScale(text, second.end, low) : null
  if (
    second &&
    range &&
    secondSuffix &&
    (!suffix?.scale ||
      !secondSuffix.scale ||
      suffix.scale === secondSuffix.scale)
  ) {
    value = range
    numbers.push(written(second))
    suffix = {
      scale: secondSuffix.scale ?? suffix?.scale ?? null,
      end: secondSuffix.end,
    }
  }
  if (!suffix) return null

  let scale = suffix.scale
  if (scale === null) {
    if (typeof value === 'number' && isTurn(text, start, suffix.end, value)) {
      return null
    }
    scale = opts.system === 'us' ? 'F' : 'C'
  }
  return {
    type: 'temperature',
    value,
    approximate: approximateBefore(text, start),
    scale,
    scaleWritten: suffix.scale !== null,
    bothGiven: false,
    at: [start, suffix.end],
    numbers,
  }
}

// --- Sizes ---

// "9 x 13", "9-by-13", and after "in." for inches: "34 in. x 18 in."
const DIMENSION_SEPARATOR = new RegExp(
  String.raw`\.?\s*(?:${TIMES}|by(?=\s))\s*|-by-`,
  'iy',
)
// The same size again in another unit: "23x28cm/9x11in", "20cm x 30cm
// (8-inch x 12-inch)".
const ALT_START = /\s*([/(])\s*/y
// Another size whose unit this one shares: "8x8x2 or 9x9x2 inches".
const OR_NEXT = /\s+(?:or|tai)\s+/iy
// No real size has more sides than this. Longer chains of numbers joined by
// "x" are something else, and stopping keeps the scan linear.
const MAX_SIDES = 4

type Size = Dimensions & {
  readonly alt: Size | null
  readonly altBy: 'slash' | 'paren'
}

function readDimensions(
  text: string,
  pos: number,
  opts: ScanOptions,
): Size | null {
  const values: Array<number> = []
  const numbers: Array<WrittenNumber> = []
  const units: Array<{ unit: Unit; at: Span } | null> = []
  let end = pos
  let p = pos
  for (;;) {
    const n = readNumber(text, p, opts.language)
    if (!n) break
    if (values.length === MAX_SIDES) return null
    const u = readUnitAfter(text, n.end, opts)
    values.push(n.value)
    numbers.push(written(n))
    units.push(u ? { unit: u.unit, at: [u.start, u.end] } : null)
    end = u?.end ?? n.end
    const sep = matchAt(DIMENSION_SEPARATOR, text, end)
    if (!sep) break
    p = end + sep[0].length
  }
  if (values.length < 2) return null
  const orMatch = units.every((u) => u === null)
    ? matchAt(OR_NEXT, text, end)
    : null
  const next = orMatch
    ? readDimensions(text, end + orMatch[0].length, opts)
    : null
  const shared =
    next?.values.length === values.length
      ? { unit: next.unit, at: next.unitAt }
      : units[units.length - 1]
  const unit = shared?.unit
  if (unit?.kind !== 'length') return null
  if (units.some((u) => u !== null && u.unit.id !== unit.id)) return null
  const unitOnlyAtEnd = units.slice(0, -1).every((u) => u === null)
  if (unitOnlyAtEnd && countsItems(text, end, values, opts.language)) {
    return null
  }
  const altMatch = matchAt(ALT_START, text, end)
  const alt = altMatch
    ? readDimensions(text, end + altMatch[0].length, opts)
    : null
  return {
    values,
    approximate: approximateBefore(text, pos),
    unit,
    at: [pos, end],
    numbers,
    unitAt: shared?.at ?? null,
    alt:
      alt && alt.values.length === values.length && alt.unit.id !== unit.id
        ? alt
        : null,
    altBy: altMatch?.[1] === '(' ? 'paren' : 'slash',
  }
}

// Whether a size such as "9 x 13 cm" starts at pos.
export function readSize(
  text: string,
  pos: number,
  opts: ScanOptions,
): boolean {
  return readDimensions(text, pos, opts) !== null
}

// --- Amounts attached to amounts ---

const SLASH = /\s*\/\s*/y

// Reads what follows a slash after an amount: "/4½oz", "/ 2 sticks".
export function readSlashed(
  text: string,
  pos: number,
  opts: ReadOptions,
): QuantityMatch | null {
  const p = endOf(SLASH, text, pos)
  return p === null ? null : readQuantity(text, p, opts)
}

// Reads "/4½oz" after an amount in unit: the same amount in another measure.
export function readSlashAlt(
  text: string,
  pos: number,
  unit: Unit | null,
  opts: ReadOptions,
): QuantityMatch | null {
  const q = readSlashed(text, pos, opts)
  if (!q || !isMeasure(q.unit) || q.unit?.id === unit?.id) return null
  return q
}

const EACH_MARK = /[àá](?=\s)\s*/y
const TOTAL_MARK = /(?:yht\.|yhteensä|total)\s*/iy
// "(14-1/2 ounces each)", "(55g/2oz each in shell)"
const EACH_AFTER = /\s*each\b[^()]*/iy
const TIMES_SIGN = new RegExp(String.raw`\s*${TIMES}\s*`, 'y')

// An amount that fills a pair of parentheses on its own.
export type ParenSize = {
  readonly q: QuantityMatch
  readonly approximate: boolean
  readonly alt: QuantityMatch | null
  readonly mark: Mark
  readonly at: Span
}

// Reads "(350 g)", "(à 170 g)", "(yht. n. 600 g)", "(4 x 100 g)", "(400g/14
// oz)" or "(8 ounces each)" at pos. The parentheses must hold nothing else.
export function readParenSize(
  text: string,
  pos: number,
  opts: ReadOptions,
): ParenSize | null {
  if (text[pos] !== '(') return null
  let p = skipSpace(text, pos + 1)
  let mark: Mark = null
  const eachEnd = endOf(EACH_MARK, text, p)
  const totalEnd = eachEnd === null ? endOf(TOTAL_MARK, text, p) : null
  if (eachEnd !== null) {
    mark = 'each'
    p = eachEnd
  } else if (totalEnd !== null) {
    mark = 'total'
    p = totalEnd
  }
  const approxEnd = readApproximately(text, p)
  p = approxEnd ?? p
  let q = readQuantity(text, p, opts)
  // "(4 x 100 g)": the size of each piece in the package.
  if (q && !q.unit) {
    const timesEnd = endOf(TIMES_SIGN, text, q.end)
    q = timesEnd === null ? null : readQuantity(text, timesEnd, opts)
    mark = 'each'
  }
  if (!q?.unit) return null
  const alt = isMeasure(q.unit) ? readSlashAlt(text, q.end, q.unit, opts) : null
  let close = skipSpace(text, alt ? alt.end : q.end)
  // "(8 oz.)"
  if (text[close] === '.') close = skipSpace(text, close + 1)
  const eachAfter = endOf(EACH_AFTER, text, close)
  if (eachAfter !== null) {
    mark = 'each'
    close = eachAfter
  }
  if (text[close] !== ')') return null
  return { q, approximate: approxEnd !== null, alt, mark, at: [pos, close + 1] }
}

// The reads of a paren size: the amount, and the same amount in another
// unit after a slash.
export function parenReads(
  paren: ParenSize,
  link: Link | null,
  index: number,
): Array<Read> {
  const main = read(amountOf(paren.q, paren.approximate), {
    link,
    mark: paren.mark,
    paren: paren.at,
  })
  if (!paren.alt) return [main]
  return [
    main,
    read(amountOf(paren.alt), {
      link: { to: index, by: 'slash' },
      paren: paren.at,
    }),
  ]
}

// --- The scan ---

const PAREN_OPEN = /\s*\(\s*/y

// Finds the parentheses in text from pos on that hold only an amount.
function findParenSizes(
  text: string,
  pos: number,
  opts: ReadOptions,
): Map<number, ParenSize> {
  const found = new Map<number, ParenSize>()
  for (let i = text.indexOf('(', pos); i !== -1; i = text.indexOf('(', i + 1)) {
    const paren = readParenSize(text, i, opts)
    if (paren) found.set(paren.q.start, paren)
  }
  return found
}

// Finds the temperatures, sizes, amounts and bare counts in text from pos
// on, appending them to reads. Indices in links are positions in reads.
export function scan(
  text: string,
  pos: number,
  opts: ScanOptions,
  reads: Array<Read> = [],
): Array<Read> {
  const parens = findParenSizes(text, pos, opts)
  const inParen = (start: number) => {
    const paren = parens.get(start)
    return paren
      ? { mark: paren.mark, paren: paren.at, approximate: paren.approximate }
      : { mark: null, paren: null, approximate: false }
  }
  let i = pos
  while (i < text.length) {
    if (NUMBER_START.test(text[i]) && atNumberBoundary(text, i)) {
      const temperature = readTemperature(text, i, opts)
      if (temperature) {
        reads.push(read(temperature))
        i = temperature.at[1]
        continue
      }
      const size = readDimensions(text, i, opts)
      if (size) {
        const index = reads.length
        reads.push(read({ type: 'dimensions', ...size }))
        i = size.at[1]
        if (size.alt) {
          reads.push(
            read(
              { type: 'dimensions', ...size.alt },
              { link: { to: index, by: size.altBy } },
            ),
          )
          i = size.alt.at[1]
        }
        continue
      }
      const q = readQuantity(text, i, opts)
      if (q) {
        const index = reads.length
        const { approximate, ...where } = inParen(q.start)
        const about = approximate || approximateBefore(text, q.start)
        reads.push(read(amountOf(q, about), where))
        i = q.end
        if (isMeasure(q.unit)) {
          const alt = readSameAfter(text, q, opts)
          if (alt) {
            reads.push(
              read(amountOf(alt.q, approximateBefore(text, alt.q.start)), {
                link: { to: index, by: alt.by },
                paren: inParen(alt.q.start).paren,
              }),
            )
            i = alt.q.end
          }
        }
        continue
      }
      i = readNumber(text, i, opts.language)?.end ?? i + 1
      continue
    }
    if (/\p{L}/u.test(text[i]) && !/\p{L}/u.test(text[i - 1] ?? '')) {
      const amount = readWordAmount(text, i, opts)
      if (amount) {
        reads.push(read(amountOf(amount, approximateBefore(text, i))))
        i = amount.end
        continue
      }
    }
    i++
  }
  return reads
}

// Reads the same amount written again in another measure right after q:
// "26cm/10in", "200g (6½ ounces)", "(¾-cup/180ml)".
function readSameAfter(
  text: string,
  q: QuantityMatch,
  opts: ReadOptions,
): { q: QuantityMatch; by: 'slash' | 'paren' } | null {
  const slashed = readSlashAlt(text, q.end, q.unit, opts)
  if (slashed) return { q: slashed, by: 'slash' }
  const open = endOf(PAREN_OPEN, text, q.end)
  if (open === null) return null
  const inner = readQuantity(text, open, opts)
  return inner && isMeasure(inner.unit) && inner.unit?.id !== q.unit?.id
    ? { q: inner, by: 'paren' }
    : null
}

// Reads an amount written in words with a measure: "kaksi desilitraa",
// "one tablespoon of".
function readWordAmount(
  text: string,
  pos: number,
  opts: ReadOptions,
): QuantityMatch | null {
  const q = readWordQuantity(text, pos, opts)
  if (!q || !isMeasure(q.unit) || q.glued) return null
  if (q.article && !articleCounts(text, q.end)) return null
  return q
}

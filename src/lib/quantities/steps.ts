import {
  atNumberBoundary,
  FRACTION_CHARS,
  readNumber,
  readNumberWord,
  readRangeSeparator,
  makeRange,
} from '@/lib/quantities/numbers'
import {
  readQuantity,
  readSlashAlt,
  readUnitAfter,
  toAmount,
} from '@/lib/quantities/quantity'
import { isMeasure } from '@/lib/quantities/units'
import type { Language, Value } from '@/lib/quantities/numbers'
import type {
  Amount,
  QuantityMatch,
  ReadOptions,
  Span,
} from '@/lib/quantities/quantity'
import type { Unit } from '@/lib/quantities/units'

export type MeasuringSystem = 'us' | 'british' | 'australian' | 'metric'

export type Temperature = {
  readonly value: Value
  readonly scale: 'C' | 'F'
  // False when the step gives no scale ("220°", "350 degrees") and it was
  // taken from the measuring system: °F for US recipes, °C for the rest.
  readonly scaleWritten: boolean
  // The step already gives both °C and °F side by side, so it stays as
  // written: "375 degrees F (190 degrees C)", "180C/350F".
  readonly bothGiven: boolean
  readonly at: Span
}

export type Dimensions = {
  readonly values: ReadonlyArray<number>
  readonly unit: Unit
  readonly at: Span
  // The same size in another unit: "23x28cm/9x11in".
  readonly alt: Dimensions | null
}

export type StepQuantity =
  | ({ readonly type: 'amount' } & Amount)
  | ({ readonly type: 'temperature' } & Temperature)
  | ({ readonly type: 'dimensions' } & Dimensions)

export type StepOptions = {
  readonly language: Language
  readonly system: MeasuringSystem
}

const NUMBER_START = new RegExp(`[\\d${FRACTION_CHARS}]`)

function exec(re: RegExp, text: string, pos: number) {
  re.lastIndex = pos
  return re.exec(text)
}

const DEGREE_SIGN = /[ \u00a0]?[°º˚][ \u00a0]?([CF](?![\p{L}]))?/uy
const DEGREE_CHAR = /[ \u00a0]?([℃℉])/y
const SCALE_LETTER = /[ \u00a0]?([CF])(?![\p{L}\d])/uy
const DEGREES =
  /\s*degrees?(?![\p{L}])(?:\s+(F|C|Fahrenheit|Celsius)(?![\p{L}]))?/iuy
const ASTE = /\s*-?\s*aste\p{L}*/iuy
const TURNING = /rotat|turn|käänn|kierr/i
const ANGLES = new Set([45, 90, 180, 270, 360])

function readTemperature(
  text: string,
  pos: number,
  opts: StepOptions,
): ({ type: 'temperature' } & Temperature) | null {
  const first = readNumber(text, pos, opts.language)
  if (!first) return null
  let value: Value = first.value
  let end = first.end
  const separatorEnd = readRangeSeparator(text, end)
  const second =
    separatorEnd === null ? null : readNumber(text, separatorEnd, opts.language)
  const range = second ? makeRange(first.value, second.value) : null
  if (second && range) {
    value = range
    end = second.end
  }
  const low = typeof value === 'number' ? value : value.min

  let scale: 'C' | 'F' | null = null
  let written = true
  let suffixEnd: number | null = null
  let m = exec(DEGREE_SIGN, text, end)
  if (m) {
    scale = (m[1] as 'C' | 'F' | undefined) ?? null
    suffixEnd = end + m[0].length
  } else if ((m = exec(DEGREE_CHAR, text, end))) {
    scale = m[1] === '℃' ? 'C' : 'F'
    suffixEnd = end + m[0].length
  } else if ((m = exec(SCALE_LETTER, text, end)) && low >= 25) {
    scale = m[1] as 'C' | 'F'
    suffixEnd = end + m[0].length
  } else if ((m = exec(DEGREES, text, end))) {
    const word = m[1] ? m[1].toUpperCase() : null
    scale = word ? (word.startsWith('F') ? 'F' : 'C') : null
    suffixEnd = end + m[0].length
  } else if ((m = exec(ASTE, text, end))) {
    // Finnish degrees are always Celsius: "200 asteessa", "225-asteisessa".
    scale = 'C'
    suffixEnd = end + m[0].length
  }
  if (suffixEnd === null) return null

  if (scale === null) {
    // "rotating tray 180°", "give it a 90° turn"
    const around = text.slice(Math.max(0, pos - 30), suffixEnd + 20)
    if (
      typeof value === 'number' &&
      ANGLES.has(value) &&
      TURNING.test(around)
    ) {
      return null
    }
    scale = opts.system === 'us' ? 'F' : 'C'
    written = false
  }
  return {
    type: 'temperature',
    value,
    scale,
    scaleWritten: written,
    bothGiven: false,
    at: [pos, suffixEnd],
  }
}

const DIMENSION_SEPARATOR = /\s*(?:[x×]|by(?=\s))\s*/iy
// The same size again in another unit: "23x28cm/9x11in", "20cm x 30cm (8-inch x 12-inch)".
const ALT_START = /\s*[/(]\s*/y
// "3 x 20cm cake tins" is three tins, not a size of 3 by 20 cm.
const COUNTED_ITEMS =
  /^[^.;,]{0,30}?\b(?:tins|pans|sheets|trays|dishes|moulds|molds|ramekins)\b/i

function readDimensions(
  text: string,
  pos: number,
  opts: StepOptions,
  read: ReadOptions,
): Dimensions | null {
  const values: Array<number> = []
  const units: Array<Unit | null> = []
  let end = pos
  let p = pos
  for (;;) {
    const n = readNumber(text, p, opts.language)
    if (!n) break
    const u = readUnitAfter(text, n.end, read)
    values.push(n.value)
    units.push(u?.unit ?? null)
    end = u?.end ?? n.end
    const sep = exec(DIMENSION_SEPARATOR, text, end)
    if (!sep) break
    p = end + sep[0].length
  }
  if (values.length < 2) return null
  const unit = units[units.length - 1]
  if (unit?.kind !== 'length') return null
  if (units.some((u) => u !== null && u.id !== unit.id)) return null
  const unitOnlyAtEnd = units.slice(0, -1).every((u) => u === null)
  if (
    opts.language === 'en' &&
    unitOnlyAtEnd &&
    values.length === 2 &&
    Number.isInteger(values[0]) &&
    values[0] <= 6 &&
    COUNTED_ITEMS.test(text.slice(end))
  ) {
    return null
  }
  const altMatch = exec(ALT_START, text, end)
  const alt = altMatch
    ? readDimensions(text, end + altMatch[0].length, opts, read)
    : null
  return {
    values,
    unit,
    at: [pos, end],
    alt:
      alt && alt.values.length === values.length && alt.unit.id !== unit.id
        ? alt
        : null,
  }
}

// Reads an amount with a measure at pos: "2 dl", "1/8 inch", "9-inch",
// "26cm/10in", "200g (6½ ounces)".
function readStepAmount(
  q: QuantityMatch | null,
  text: string,
  read: ReadOptions,
): Amount | null {
  if (!q || !isMeasure(q.unit)) return null
  let alt = readSlashAlt(text, q.end, q.unit, read)
  if (!alt) {
    const open = /\s*\(\s*/y
    const m = exec(open, text, q.end)
    const inner = m ? readQuantity(text, q.end + m[0].length, read) : null
    if (inner && isMeasure(inner.unit) && inner.unit?.id !== q.unit?.id) {
      alt = toAmount(inner, false)
    }
  }
  return toAmount(q, false, alt)
}

// "a tablespoon of" counts, "a tablespoon cookie scoop" doesn't.
const ARTICLE_OF = /\s+(?:or so\s+)?of\b/iy
// Finnish unit words that mean one of themselves: "teelusikallinen suolaa".
const ONE_OF =
  /(?:litra|desilitra|kilo|teelusikallinen|ruokalusikallinen|maustemitallinen)(?![\p{L}\d])/iuy

function readWordAmount(
  text: string,
  pos: number,
  opts: StepOptions,
  read: ReadOptions,
): { amount: Amount; end: number } | null {
  const word = readNumberWord(text, pos, opts.language)
  if (word) {
    const unit = readUnitAfter(text, word.end, read)
    if (!unit || !isMeasure(unit.unit) || unit.start === word.end) return null
    if (word.article && !exec(ARTICLE_OF, text, unit.end)) return null
    const q: QuantityMatch = {
      value: word.value,
      unit: unit.unit,
      start: pos,
      end: unit.end,
      valueEnd: word.end,
      unitAt: [unit.start, unit.end],
    }
    return { amount: toAmount(q, false), end: unit.end }
  }
  if (opts.language === 'fi' && atNumberBoundary(text, pos)) {
    const m = exec(ONE_OF, text, pos)
    const unit = m ? readUnitAfter(text, pos, read) : null
    if (m && unit) {
      const end = pos + m[0].length
      const q: QuantityMatch = {
        value: 1,
        unit: unit.unit,
        start: pos,
        end,
        valueEnd: pos,
        unitAt: [pos, end],
      }
      return { amount: toAmount(q, false), end }
    }
  }
  return null
}

const BOTH_GIVEN_GAP =
  /^\s*(?:fan(?:[- ]forced)?|kiertoilma\p{L}*)?\s*[/(]\s*$/iu

// Marks temperatures that sit together ("180C/160C fan/350F") as already
// giving both scales when the group has both °C and °F.
function markBothGiven(
  text: string,
  found: Array<StepQuantity>,
): Array<StepQuantity> {
  const out = [...found]
  let groupStart = 0
  for (let i = 1; i <= out.length; i++) {
    const prev = out[i - 1]
    const cur = out[i] as StepQuantity | undefined
    const joined =
      cur?.type === 'temperature' &&
      prev.type === 'temperature' &&
      BOTH_GIVEN_GAP.test(text.slice(prev.at[1], cur.at[0]))
    if (joined) continue
    const group = out.slice(groupStart, i)
    const scales = new Set(
      group.flatMap((q) => (q.type === 'temperature' ? [q.scale] : [])),
    )
    if (scales.size === 2) {
      for (let j = groupStart; j < i; j++) {
        const q = out[j]
        if (q.type === 'temperature') out[j] = { ...q, bothGiven: true }
      }
    }
    groupStart = i
  }
  return out
}

// Finds the temperatures and measured amounts in a step: everything that
// converts. Package and count units, bare numbers and times are left alone.
export function scanStep(text: string, opts: StepOptions): Array<StepQuantity> {
  const read: ReadOptions = {
    language: opts.language,
    context: 'other',
    hyphens: true,
  }
  const found: Array<StepQuantity> = []
  let i = 0
  while (i < text.length) {
    if (NUMBER_START.test(text[i]) && atNumberBoundary(text, i)) {
      const temperature = readTemperature(text, i, opts)
      if (temperature) {
        found.push(temperature)
        i = temperature.at[1]
        continue
      }
      const dimensions = readDimensions(text, i, opts, read)
      if (dimensions) {
        found.push({ type: 'dimensions', ...dimensions })
        i = (dimensions.alt ?? dimensions).at[1]
        continue
      }
      const q = readQuantity(text, i, read)
      const amount = readStepAmount(q, text, read)
      if (amount) {
        found.push({ type: 'amount', ...amount })
        i = (amount.alt ?? amount).at[1]
        continue
      }
      i = q?.end ?? readNumber(text, i, opts.language)?.end ?? i + 1
      continue
    }
    if (/\p{L}/u.test(text[i]) && !/\p{L}/u.test(text[i - 1] ?? '')) {
      const word = readWordAmount(text, i, opts, read)
      if (word) {
        found.push({ type: 'amount', ...word.amount })
        i = word.end
        continue
      }
    }
    i++
  }
  return markBothGiven(text, found)
}

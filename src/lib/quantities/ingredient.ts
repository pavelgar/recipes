import {
  FRACTION_CHARS,
  readApproximately,
  readNumberWord,
  skipSpace,
} from '@/lib/quantities/numbers'
import {
  readQuantity,
  readSlashAlt,
  readSlashed,
  readUnitAfter,
  toAmount,
} from '@/lib/quantities/quantity'
import { isMeasure } from '@/lib/quantities/units'
import type { Language } from '@/lib/quantities/numbers'
import type {
  Amount,
  QuantityMatch,
  ReadOptions,
} from '@/lib/quantities/quantity'
import type { Unit } from '@/lib/quantities/units'

export type ExtraRole =
  // The size of one package or piece, which stays fixed when servings
  // change: "2 pkt (à 170 g)", "2 x 150g cartons", "1 (14 ounce) can".
  | 'each'
  // The size of everything on the line, which scales: "1 prk (400 g)",
  // "4 välikyljystä (yht. n. 600 g)".
  | 'total'
  // The same amount written another way, which scales: "400 g … (1 prk)".
  | 'same'

export type Extra = Amount & { readonly role: ExtraRole }

export type IngredientResult =
  // An amount with a volume, weight or length unit. Scales and converts.
  | 'measured'
  // An amount with a package, count or pinch unit, or no unit. Scales.
  | 'counted'
  // No number at all: "suolaa". Shown as written.
  | 'no-amount'
  // A number the parser couldn't place. Shown as written, not scaled.
  | 'unrecognised'

export type ParsedIngredient = {
  readonly text: string
  readonly result: IngredientResult
  // The amount that scales with servings.
  readonly amount: Amount | null
  // A second amount on the line, such as a package size.
  readonly extra: Extra | null
}

type Mark = 'each' | 'total' | null

type ParenSize = {
  readonly amount: Amount
  readonly mark: Mark
  readonly end: number
}

const EACH_MARK = /[àá](?=\s)\s*/y
const TOTAL_MARK = /(?:yht\.|yhteensä|total)\s*/iy
const TIMES = /\s*[x×]\s*/y
// After an amount, a second amount the parser shouldn't guess at:
// "2 + 2rkl", "1 tbsp plus 1 tsp", "4 x 3cm / 1 x 2"".
const JOINED = new RegExp(
  String.raw`\s*(?:\+|plus\b|&|\/)\s*[\d${FRACTION_CHARS}]`,
  'iy',
)
const STRAY_NUMBER = new RegExp(`[\\d${FRACTION_CHARS}]`)

// Finnish unit words that mean one of themselves: "litra maitoa".
const ONE_OF =
  /(?:litra|desilitra|kilo|teelusikallinen|ruokalusikallinen|maustemitallinen)(?![\p{L}\d])/iuy

function endOf(re: RegExp, text: string, pos: number): number | null {
  re.lastIndex = pos
  const m = re.exec(text)
  return m ? pos + m[0].length : null
}

// Reads "(350 g)", "(à 170 g)", "(yht. n. 600 g)", "(4 x 100 g)" or
// "(400g/14 oz)" at pos. The parentheses must hold nothing else.
function readParenSize(
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
    const timesEnd = endOf(TIMES, text, q.end)
    q = timesEnd === null ? null : readQuantity(text, timesEnd, opts)
    mark = 'each'
  }
  if (!q?.unit) return null
  const alt = isMeasure(q.unit) ? readSlashAlt(text, q.end, q.unit, opts) : null
  const close = skipSpace(text, alt ? alt.at[1] : q.end)
  if (text[close] !== ')') return null
  return {
    amount: toAmount(q, approxEnd !== null, alt),
    mark,
    end: close + 1,
  }
}

// The role of a size next to a package, a count or a plain number.
function sizeRole(size: ParenSize): ExtraRole {
  if (!isMeasure(size.amount.unit)) return 'same'
  if (size.mark) return size.mark
  // Lengths never add up: "2 (9 inch) pie crusts".
  return size.amount.unit?.kind === 'length' ? 'each' : 'total'
}

type Leading = {
  amount: Amount
  extra: Extra | null
  end: number
}

// Reads the number (or number word) at the start of the line.
function readLeadingQuantity(
  text: string,
  pos: number,
  opts: ReadOptions,
): QuantityMatch | null {
  const q = readQuantity(text, pos, opts)
  if (q) return q
  const word = readNumberWord(text, pos, opts.language)
  if (word) {
    const unit = readUnitAfter(text, word.end, opts)
    if (word.article && !unit) return null
    return {
      value: word.value,
      unit: unit?.unit ?? null,
      start: pos,
      end: unit?.end ?? word.end,
      valueEnd: word.end,
      unitAt: unit ? [unit.start, unit.end] : null,
    }
  }
  if (opts.language === 'fi') {
    const end = endOf(ONE_OF, text, pos)
    if (end !== null) {
      const unit = readUnitAfter(text, pos, opts)
      if (unit) {
        return {
          value: 1,
          unit: unit.unit,
          start: pos,
          end,
          valueEnd: pos,
          unitAt: [pos, end],
        }
      }
    }
  }
  return null
}

function readLeading(
  text: string,
  pos: number,
  opts: ReadOptions,
): Leading | 'unrecognised' | null {
  const approxEnd = readApproximately(text, pos)
  const start = approxEnd ?? pos
  const q = readLeadingQuantity(text, start, opts)
  if (!q) return null
  const approximate = approxEnd !== null

  let unit: Unit | null = q.unit
  let unitAt = q.unitAt
  let end = q.end
  let extra: Extra | null = null
  let alt: Amount | null = null

  if (!unit) {
    const timesEnd = endOf(TIMES, text, q.end)
    const paren =
      timesEnd === null
        ? readParenSize(text, skipSpace(text, q.end), opts)
        : null
    if (timesEnd !== null) {
      // "2 x 150g cartons", "½ x 400g/14 oz tin"
      const size = readQuantity(text, timesEnd, opts)
      if (size && isMeasure(size.unit)) {
        const sizeAlt = readSlashAlt(text, size.end, size.unit, opts)
        extra = { ...toAmount(size, false, sizeAlt), role: 'each' }
        end = sizeAlt?.at[1] ?? size.end
        const word = readUnitAfter(text, end, opts)
        if (word && !isMeasure(word.unit)) {
          unit = word.unit
          unitAt = [word.start, word.end]
          end = word.end
        }
      }
    } else if (paren) {
      // "1 (14 ounce) can", "4 (800g) chicken breast fillets"
      const word = readUnitAfter(text, paren.end, opts)
      const packaged =
        word?.unit.kind === 'package' || word?.unit.kind === 'count'
      const role = packaged ? (paren.mark ?? 'each') : sizeRole(paren)
      extra = { ...paren.amount, role }
      end = paren.end
      if (word && packaged) {
        unit = word.unit
        unitAt = [word.start, word.end]
        end = word.end
      }
    }
  } else {
    const slashAlt = isMeasure(unit)
      ? readSlashAlt(text, end, unit, opts)
      : null
    const slashed = slashAlt ? null : readSlashed(text, end, opts)
    const paren =
      slashAlt || slashed
        ? null
        : readParenSize(text, skipSpace(text, end), opts)
    if (slashAlt) {
      alt = slashAlt
      end = slashAlt.at[1]
    } else if (slashed?.unit && isMeasure(unit)) {
      // "250g / 2 sticks"
      extra = { ...toAmount(slashed, false), role: 'same' }
      end = slashed.end
    } else if (paren) {
      if (isMeasure(unit) && isMeasure(paren.amount.unit) && !paren.mark) {
        // "2 2/3 cups (320g)"
        alt = paren.amount
      } else if (isMeasure(unit)) {
        extra = { ...paren.amount, role: 'same' }
      } else {
        // "1 prk (400 g)", "2 pkt (à 170 g)"
        extra = { ...paren.amount, role: sizeRole(paren) }
      }
      end = paren.end
    }
  }

  if (endOf(JOINED, text, end) !== null) return 'unrecognised'
  // "1 lb 4 oz", "2 dl 1 rkl": two amounts in a row.
  const next = readQuantity(text, skipSpace(text, end), opts)
  if (next && isMeasure(next.unit) && skipSpace(text, end) > end) {
    return 'unrecognised'
  }

  const amount: Amount = {
    ...toAmount(q, approximate, alt),
    unit,
    unitAt,
    at: [q.start, unitAt ? Math.max(unitAt[1], q.end) : q.end],
  }
  return { amount, extra, end }
}

// Finds an amount in parentheses after pos: "Ison sitruunan mehu (90 ml)",
// "4 thick slices ciabatta bread (120g)". A number before it means the
// parentheses belong to something else: "… or 4 tablespoons (57g) butter".
function findParenSize(
  text: string,
  pos: number,
  opts: ReadOptions,
): ParenSize | null {
  for (let i = text.indexOf('(', pos); i !== -1; i = text.indexOf('(', i + 1)) {
    if (hasStrayNumber(text.slice(pos, i))) return null
    const paren = readParenSize(text, i, opts)
    if (paren) return paren
  }
  return null
}

// Whether text has a number that isn't a percentage or a note reference.
function hasStrayNumber(text: string): boolean {
  const rest = text
    .replace(/\b(?:note|step)s?\s*\d+/gi, '')
    .replace(/\d+(?:[.,]\d+)?\s*%/g, '')
  return STRAY_NUMBER.test(rest)
}

function resultOf(amount: Amount): IngredientResult {
  return isMeasure(amount.unit) ? 'measured' : 'counted'
}

export function parseIngredient(
  text: string,
  language: Language,
): ParsedIngredient {
  const opts: ReadOptions = {
    language,
    context: language === 'fi' ? 'fi-ingredient' : 'other',
    hyphens: false,
  }
  const unrecognised: ParsedIngredient = {
    text,
    result: 'unrecognised',
    amount: null,
    extra: null,
  }
  let start = skipSpace(text, 0)
  // Optional ingredients come wrapped in parentheses: "(3-4 cl konjakkia)".
  if (text[start] === '(' && text.trimEnd().endsWith(')')) {
    start = skipSpace(text, start + 1)
  }
  const leading = readLeading(text, start, opts)
  if (leading === 'unrecognised') return unrecognised

  if (leading) {
    let { extra } = leading
    if (!extra) {
      const paren = findParenSize(text, leading.end, opts)
      if (paren) {
        const role: ExtraRole = isMeasure(leading.amount.unit)
          ? 'same'
          : sizeRole(paren)
        extra = { ...paren.amount, role }
      }
    }
    return {
      text,
      result: resultOf(leading.amount),
      amount: leading.amount,
      extra,
    }
  }

  const paren = findParenSize(text, 0, opts)
  if (paren) {
    return {
      text,
      result: resultOf(paren.amount),
      amount: paren.amount,
      extra: null,
    }
  }
  if (hasStrayNumber(text)) return unrecognised
  return { text, result: 'no-amount', amount: null, extra: null }
}

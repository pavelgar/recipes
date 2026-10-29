import { sortBy } from 'es-toolkit'
import { caseOfEnding } from '@/core/quantities/finnish'
import {
  agreeingWord,
  formatDecimal,
  formatDimensions,
  formatFraction,
  formatMeasure,
  formatTemperature,
  numberWord,
} from '@/core/quantities/format'
import {
  CONVERSION_LIMIT,
  cupsWithSpoons,
  HALVES,
  INCHES,
  mapValue,
  maxOf,
  measureSize,
  metricLengths,
  metricVolume,
  metricWeight,
  nearestFraction,
  QUARTERS,
  SIMPLE,
  tablespoonsWithTeaspoons,
  TEASPOON,
  toCelsius,
  toFahrenheit,
  usLengths,
  usVolume,
  usWeight,
} from '@/core/quantities/kitchen'
import {
  AUSTRALIAN_TABLESPOON_IN_TEASPOONS,
  isAustralianTablespoon,
  readsAsWritten,
  scaleOf,
  sizeOf,
} from '@/core/quantities/measures'
import { unitOf } from '@/core/quantities/scan'
import { canonical, matchAt } from '@/core/quantities/text'
import { caseOfUnitWord, dimensionOf, isMeasure } from '@/core/quantities/units'
import type { Case } from '@/core/quantities/finnish'
import type { ParsedIngredient } from '@/core/quantities/ingredient'
import type { Measure } from '@/core/quantities/kitchen'
import type { LineQuantity } from '@/core/quantities/line'
import type { DisplaySystem } from '@/core/quantities/measures'
import type { Language, Value } from '@/core/quantities/numbers'
import type { Span, WrittenNumber } from '@/core/quantities/quantity'
import type { MeasuringSystem, Quantity } from '@/core/quantities/scan'
import type { Unit } from '@/core/quantities/units'

// Shows a parsed line or step the way a device displays it: amounts scaled
// to the servings and converted to the device's unit system, everything
// else exactly as written. See DESIGN.md, "Units".

export type PresentOptions = {
  // The recipe's language, which converted text follows: "0,8 dl" and "⅓
  // kuppia" in Finnish, "0.8 dl" and "⅓ cup" in English.
  readonly language: Language
  // How the recipe's units read: the size of its cups and spoons.
  readonly system: MeasuringSystem
  readonly display: DisplaySystem
  // Servings shown divided by servings written. Steps don't scale.
  readonly factor?: number
}

export type Segment =
  | { readonly kind: 'text'; readonly text: string }
  | {
      readonly kind: 'quantity'
      // The quantity this text shows, as an index into the parsed list. A
      // quantity shown in place may take several segments: its number and
      // its unit word.
      readonly index: number
      readonly text: string
      readonly original: string
      // Shown in another unit than written.
      readonly converted: boolean
      // Changed to follow the servings.
      readonly scaled: boolean
    }

export type Presented = {
  readonly text: string
  readonly segments: ReadonlyArray<Segment>
}

type Edit = {
  readonly at: Span
  readonly text: string
  readonly index: number
  readonly converted: boolean
  readonly scaled: boolean
}

export function presentIngredient(
  parsed: ParsedIngredient,
  opts: PresentOptions,
): Presented {
  return present(parsed.text, parsed.quantities, opts)
}

export function presentStep(
  text: string,
  quantities: ReadonlyArray<LineQuantity>,
  opts: PresentOptions,
): Presented {
  return present(text, quantities, { ...opts, factor: 1 })
}

const within = (inner: Span, outer: Span) =>
  inner[0] >= outer[0] && inner[1] <= outer[1]

// --- Which quantities convert ---

// Whether a quantity already reads in the display system.
function readsInDisplay(q: Quantity, opts: PresentOptions): boolean {
  if (q.type === 'temperature') return q.scale === scaleOf(opts.display)
  const unit = unitOf(q)
  return (
    unit !== null &&
    isMeasure(unit) &&
    readsAsWritten(unit, opts.system, opts.display)
  )
}

// Whether a quantity is a measure or temperature written in the other
// system.
function needsConversion(q: Quantity, opts: PresentOptions): boolean {
  if (q.type === 'temperature') return !q.bothGiven && !readsInDisplay(q, opts)
  return isMeasure(unitOf(q)) && !readsInDisplay(q, opts)
}

// The quantity a "same", "each" or "total" belongs to, followed to the
// top: in "125g/4½oz" the ounces' root is the grams, in "1 cup plus 2
// tablespoons (134g)" the grams' root is the cup, and in "one 8-ounce
// package (227g)" both sizes' root is the package, so the grams keep the
// ounces as written on a metric device.
function rootOf(list: ReadonlyArray<LineQuantity>, i: number): number {
  let root = i
  for (;;) {
    const { of } = list[root]
    if (of === null) return root
    root = of
  }
}

// Text that already gives the display system stays as written: in
// "2 2/3 cups (320g)" the grams serve a metric reader, so the cups stay.
function convertingRoots(
  list: ReadonlyArray<LineQuantity>,
  opts: PresentOptions,
): Set<number> {
  const readable = new Set<number>()
  list.forEach((q, i) => {
    const measure = q.type !== 'amount' || isMeasure(q.unit)
    if (measure && readsInDisplay(q, opts)) readable.add(rootOf(list, i))
  })
  const roots = new Set<number>()
  list.forEach((q, i) => {
    const root = rootOf(list, i)
    if (needsConversion(q, opts) && !readable.has(root)) roots.add(root)
  })
  return roots
}

// --- Converting ---

// Up to 3 Australian tablespoons by volume, in 15 ml tablespoons and
// teaspoons: whole tablespoons, and teaspoons for the rest. 1 tbsp → 1 rkl
// + 1 tl, 2 tbsp → 2 rkl + 2 tl, 3 tbsp → 4 rkl, ½ tbsp → 2 tl. A range
// rounds both ends to half tablespoons.
function australianTablespoons(value: Value): Measure {
  const inTeaspoons = (n: number) => n * AUSTRALIAN_TABLESPOON_IN_TEASPOONS
  if (typeof value !== 'number') {
    const tbsp = mapValue(value, (n) =>
      nearestFraction(inTeaspoons(n) / 3, HALVES),
    )
    return [{ unit: 'tbsp', value: tbsp }]
  }
  const tsp = inTeaspoons(value)
  let tbsp = Math.floor(tsp / 3 + 1e-9)
  let rest = nearestFraction(tsp - tbsp * 3, TEASPOON)
  if (rest >= 3) {
    tbsp++
    rest -= 3
  }
  if (tbsp === 0) return [{ unit: 'tsp', value: rest }]
  if (rest === 0) return [{ unit: 'tbsp', value: tbsp }]
  return [
    { unit: 'tbsp', value: tbsp },
    { unit: 'tsp', value: rest },
  ]
}

// The amount in the display system, written in the recipe's language.
function convertAmount(
  value: Value,
  unit: Unit,
  opts: PresentOptions,
  form: Case | null,
): string | null {
  // Up to 3 Australian tablespoons read in spoons; more follow the
  // display's volume rule below, like any other volume.
  if (isAustralianTablespoon(unit, opts.system) && maxOf(value) <= 3) {
    return formatMeasure(australianTablespoons(value), opts.language, form)
  }
  const size = sizeOf(unit, opts.system)
  const dimension = dimensionOf(unit)
  if (size === null || dimension === null) return null
  const base = mapValue(value, (n) => n * size)
  const metric = opts.display === 'metric'
  let measure: Measure
  if (dimension === 'volume') {
    measure = metric
      ? metricVolume(base)
      : usVolume(base, opts.language === 'en')
  } else if (dimension === 'weight') {
    measure = metric ? metricWeight(base) : usWeight(base)
  } else if (metric) {
    const { values, unit: lengthUnit } = metricLengths([base])
    measure = [{ unit: lengthUnit, value: values[0] }]
  } else {
    measure = [{ unit: 'in', value: usLengths([base])[0] }]
  }
  const exact = maxOf(base)
  const shown = measureSize(measure, !metric)
  if (Math.abs(shown - exact) > CONVERSION_LIMIT * exact) return null
  return formatMeasure(measure, opts.language, form)
}

function convert(
  q: Quantity,
  value: Value,
  opts: PresentOptions,
  form: Case | null,
): string | null {
  switch (q.type) {
    case 'temperature': {
      const toF = opts.display === 'us'
      const shown = mapValue(q.value, toF ? toFahrenheit : toCelsius)
      return formatTemperature(shown, toF ? 'F' : 'C', opts.language)
    }
    case 'dimensions': {
      const size = sizeOf(q.unit, opts.system)
      if (size === null) return null
      const mm = q.values.map((v) => v * size)
      if (opts.display === 'us') {
        return formatDimensions(usLengths(mm), 'in', opts.language, form)
      }
      const { values, unit } = metricLengths(mm)
      return formatDimensions(values, unit, opts.language, form)
    }
    case 'amount':
      return q.unit ? convertAmount(value, q.unit, opts, form) : null
  }
}

// After an abbreviation, the ending of its case: "2 cm:n", "5 dl:ssa".
const CASE_ENDING = /:(\p{L}+)/uy

// The Finnish case a conversion is written in, and where the text it
// replaces ends: the case of the unit word ("6 desissä vettä" → "2½
// kupissa vettä"), or that of the ending after an abbreviation, which the
// conversion rewrites ("2 cm:n levyinen" → "¾ tuuman levyinen").
// Temperatures keep theirs as written: "180 °C:ssa" → "350 °F:ssa".
function writtenCase(
  text: string,
  q: Quantity,
  language: Language,
): { readonly form: Case | null; readonly end: number } {
  const end = q.at[1]
  const unitAt = q.type === 'temperature' ? null : q.unitAt
  if (language !== 'fi' || !unitAt || unitAt[1] !== end) {
    return { form: null, end }
  }
  const fromWord = caseOfUnitWord(text.slice(unitAt[0], unitAt[1]))
  if (fromWord) return { form: fromWord, end }
  const m = matchAt(CASE_ENDING, text, end)
  const fromEnding = m ? caseOfEnding(m[1]) : null
  return m && fromEnding
    ? { form: fromEnding, end: end + m[0].length }
    : { form: null, end }
}

// --- Scaling in place ---

// Fractions a scaled amount snaps to, by unit.
function fractionsFor(unit: Unit | null): ReadonlyArray<number> {
  switch (unit?.id) {
    case 'tsp':
    case 'maustemitta':
      return TEASPOON
    case 'tbsp':
      return HALVES
    case 'in':
      return INCHES
    case 'oz':
    case 'lb':
      return QUARTERS
    default:
      return SIMPLE
  }
}

// Metric units scale as decimals ("1,5 dl") or whole numbers ("300 g");
// everything else as fractions.
const DECIMAL_UNITS = new Set(['cl', 'dl', 'l', 'kg', 'cm'])
const WHOLE_UNITS = new Set(['g', 'ml', 'mm'])

// The writer's way with fractions: "1½", "1 ½", "1 1/2" or "1-1/2".
function fractionStyleOf(written: string) {
  const original = canonical(written)
  const slash = original.includes('/')
  const joiner = slash
    ? /\d-\d/.test(original)
      ? '-'
      : ' '
    : /\d\s+\D/.test(original)
      ? ' '
      : ''
  return { slash, joiner }
}

// The fractions a scaled number in this unit is written with.
const scaledFractions = (unit: Unit | null) =>
  DECIMAL_UNITS.has(unit?.id ?? '') || WHOLE_UNITS.has(unit?.id ?? '')
    ? SIMPLE
    : fractionsFor(unit)

// How far the nearest fraction may miss a scaled measure before the amount
// is written as a decimal instead: 1/3 dl × 1,25 is 0,42 dl, which 1/3
// misses by 20%, so it reads 0,4 dl. Cups and tablespoons take spoons added
// instead (spoonFallback), and counts and packages keep the nearest
// fraction: nobody cuts 0,4 of an onion.
const FRACTION_TOLERANCE = 0.1

function fractionFarOff(n: number, unit: Unit | null): boolean {
  if (!unit || !isMeasure(unit) || n <= 0) return false
  if (unit.id === 'cup' || unit.id === 'tbsp') return false
  return (
    Math.abs(nearestFraction(n, scaledFractions(unit)) - n) / n >
    FRACTION_TOLERANCE
  )
}

// A scaled number written the way the original was: decimals stay
// decimals, fractions fractions, words words. With `decimal`, a number
// that would be a fraction is a decimal instead.
function formatLike(
  n: number,
  written: WrittenNumber,
  original: string,
  unit: Unit | null,
  language: Language,
  styleFrom = original,
  decimal = false,
): string {
  if (written.form === 'decimal') {
    const separator = original.includes(',') ? ',' : '.'
    return formatDecimal(n, language, n < 1 ? 2 : 1, separator)
  }
  if (written.form === 'word') {
    const word = numberWord(n, original, language)
    if (word) return word
  }
  const id = unit?.id ?? ''
  if (written.form !== 'fraction') {
    // Grams and millilitres round to 5 from 20 up, whole or not: 175 g × 1,5
    // → 265 g, 142 ml × 1,5 → 215 ml.
    if (WHOLE_UNITS.has(id) && n >= 20) return String(Math.round(n / 5) * 5)
    if (Number.isInteger(Math.round(n * 1e6) / 1e6))
      return String(Math.round(n))
    if (DECIMAL_UNITS.has(id)) return formatDecimal(n, language, n < 1 ? 2 : 1)
    if (WHOLE_UNITS.has(id)) {
      return n < 10 ? formatDecimal(n, language) : String(Math.round(n))
    }
  }
  if (decimal) return formatDecimal(n, language, n < 0.1 ? 2 : 1)
  return formatFraction(
    nearestFraction(n, scaledFractions(unit)),
    fractionStyleOf(styleFrom),
  )
}

// Cups and tablespoons that no simple fraction fits within 6% take spoons
// added instead: ⅓ cup × 1,2 → ⅓ cup + 1 tbsp.
function spoonFallback(n: number, unit: Unit | null): Measure | null {
  if (unit?.id !== 'cup' && unit?.id !== 'tbsp') return null
  const near = nearestFraction(n, fractionsFor(unit))
  if (Math.abs(near - n) / n <= 0.06) return null
  return unit.id === 'cup' ? cupsWithSpoons(n, 16) : tablespoonsWithTeaspoons(n)
}

// "2 lb 10 oz" for a scaled "1lb 5oz", in the writer's spacing.
function poundsAndOunces(lb: number, original: string): string {
  let pounds = Math.floor(lb)
  let ounces = Math.round((lb - pounds) * 16)
  if (ounces === 16) {
    pounds++
    ounces = 0
  }
  const space = /\d\s+lb/i.test(original) ? ' ' : ''
  return ounces
    ? `${pounds}${space}lb ${ounces}${space}oz`
    : `${pounds}${space}lb`
}

function scaleInPlace(
  text: string,
  q: Quantity & { readonly type: 'amount' },
  value: Value,
  index: number,
  opts: PresentOptions,
): Array<Edit> {
  const edit = (at: Span, replacement: string): Edit => ({
    at,
    text: replacement,
    index,
    converted: false,
    scaled: true,
  })
  const unitText = q.unitAt ? text.slice(q.unitAt[0], q.unitAt[1]) : null
  const original = text.slice(q.at[0], q.at[1])
  // "1lb 5oz"
  if (
    q.unit?.id === 'lb' &&
    unitText &&
    /\d/.test(unitText) &&
    typeof value === 'number'
  ) {
    return [edit(q.at, poundsAndOunces(value, original))]
  }
  if (typeof value === 'number') {
    const fallback = spoonFallback(value, q.unit)
    if (fallback) return [edit(q.at, formatMeasure(fallback, opts.language))]
  }
  const ends = typeof value === 'number' ? [value] : [value.min, value.max]
  // Both ends of a range are decimals when either is.
  const decimal = ends.some((end) => fractionFarOff(end, q.unit))
  // "teelusikallinen": the word is both the number and the unit.
  const [first] = q.numbers
  if (
    q.numbers.length === 1 &&
    q.unitAt &&
    unitText &&
    first.at[0] === q.unitAt[0] &&
    first.at[1] === q.unitAt[1]
  ) {
    const number = formatLike(
      ends[0],
      { ...first, form: 'integer' },
      '',
      q.unit,
      opts.language,
    )
    const word = agreeingWord(unitText, value, opts.language) ?? unitText
    return [edit(q.at, `${number} ${word}`)]
  }
  // Both ends of a range take the style of the one written as a fraction:
  // "1/2 to 1 teaspoon" × 1,5 → "3/4 to 1 1/2 teaspoons".
  const numbersText = q.numbers
    .map((n) => text.slice(n.at[0], n.at[1]))
    .join(' ')
  const edits = q.numbers.map((n, i) =>
    edit(
      n.at,
      formatLike(
        ends[Math.min(i, ends.length - 1)],
        n,
        text.slice(n.at[0], n.at[1]),
        q.unit,
        opts.language,
        numbersText,
        decimal,
      ),
    ),
  )
  if (q.unitAt && unitText && within(q.unitAt, q.at)) {
    const word = agreeingWord(unitText, value, opts.language)
    edits.push(edit(q.unitAt, word ?? unitText))
  }
  return edits
}

// The span a conversion replaces, and its text. The span takes the full
// stop of an abbreviation along ("1-in. balls" → "2.5 cm balls", not "2.5
// cm. balls"), but not one that ends the sentence. In English, an article
// right before is rewritten to agree: "an 11x7-inch dish" → "a 28 × 18 cm
// dish".
const ABBREVIATION_STOP = /^\.(?=\s+\p{Ll}|[),;])/u
const ARTICLE_BEFORE = /\b(an?)\s+$/i

function articleFor(next: string): 'a' | 'an' {
  // "an 8", "an 11", "an 18", "an 80 °C", "an inch"
  return /^(?:8|11(?![\d.,])|18(?![\d.,])|[aeio])/i.test(next) ? 'an' : 'a'
}

function conversionEdit(
  text: string,
  q: Quantity,
  converted: string,
  index: number,
  scaled: boolean,
  language: Language,
  replacedEnd: number,
): Edit {
  let start = q.at[0]
  let end = replacedEnd
  let replacement = converted
  if (ABBREVIATION_STOP.test(text.slice(end, end + 3))) end++
  const article =
    language === 'en' ? ARTICLE_BEFORE.exec(text.slice(0, start)) : null
  if (article) {
    const wanted = articleFor(converted)
    if (wanted !== article[1].toLowerCase()) {
      const capital = /^A/.test(article[1])
      const word = capital ? wanted[0].toUpperCase() + wanted.slice(1) : wanted
      start -= article[0].length
      replacement = `${word}${article[0].slice(article[1].length)}${converted}`
    }
  }
  return { at: [start, end], text: replacement, index, converted: true, scaled }
}

// --- Putting it together ---

// The spans that show a quantity left as written. A quantity with another
// inside it ("1 (14 ounce) can") shows as its number and unit word.
function piecesOf(list: ReadonlyArray<LineQuantity>, i: number): Array<Span> {
  const q = list[i]
  const nested = list.some((other, j) => j !== i && within(other.at, q.at))
  if (!nested) return [q.at]
  const unitAt = q.type === 'temperature' ? null : q.unitAt
  return [
    ...q.numbers.map((n) => n.at),
    ...(unitAt && within(unitAt, q.at) ? [unitAt] : []),
  ]
}

function present(
  text: string,
  list: ReadonlyArray<LineQuantity>,
  opts: PresentOptions,
): Presented {
  const factor = opts.factor ?? 1
  const roots = convertingRoots(list, opts)
  const edits: Array<Edit> = []
  list.forEach((q, i) => {
    const scaling = q.type === 'amount' && q.scales && factor !== 1
    // Only amounts scale; sizes and temperatures convert as written.
    const value =
      q.type === 'dimensions'
        ? 0
        : scaling
          ? mapValue(q.value, (n) => n * factor)
          : q.value
    const nested = list.some((other, j) => j !== i && within(other.at, q.at))
    // Of a group in units the display doesn't use, only the first converts,
    // and the rest stay as written rather than repeat it: "330ml/11fl oz",
    // "200 g (3-4 dl)" and an Australian recipe's "100 g (7 tbsp)" on a US
    // device.
    const root = rootOf(list, i)
    const repeat =
      root !== i &&
      list.some(
        (other, j) =>
          j < i && rootOf(list, j) === root && needsConversion(other, opts),
      )
    if (roots.has(root) && needsConversion(q, opts) && !nested && !repeat) {
      const written = writtenCase(text, q, opts.language)
      const converted = convert(q, value, opts, written.form)
      if (converted !== null) {
        edits.push(
          conversionEdit(
            text,
            q,
            converted,
            i,
            scaling,
            opts.language,
            written.end,
          ),
        )
        return
      }
    }
    if (scaling) {
      edits.push(...scaleInPlace(text, q, value, i, opts))
      return
    }
    for (const at of piecesOf(list, i)) {
      edits.push({
        at,
        text: text.slice(at[0], at[1]),
        index: i,
        converted: false,
        scaled: false,
      })
    }
  })
  return build(text, edits)
}

function build(text: string, edits: ReadonlyArray<Edit>): Presented {
  const sorted = sortBy(edits, [(e) => e.at[0], (e) => e.at[1]])
  const segments: Array<Segment> = []
  let pos = 0
  for (const e of sorted) {
    // Two quantities can't both show the same text.
    if (e.at[0] < pos) continue
    if (e.at[0] > pos)
      segments.push({ kind: 'text', text: text.slice(pos, e.at[0]) })
    segments.push({
      kind: 'quantity',
      index: e.index,
      text: e.text,
      original: text.slice(e.at[0], e.at[1]),
      converted: e.converted,
      scaled: e.scaled,
    })
    pos = e.at[1]
  }
  if (pos < text.length) segments.push({ kind: 'text', text: text.slice(pos) })
  return { text: segments.map((s) => s.text).join(''), segments }
}

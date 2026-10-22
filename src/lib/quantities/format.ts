import pluralize from 'pluralize'
import { abbreviationEnding, inflect } from '@/lib/quantities/finnish'
import { maxOf } from '@/lib/quantities/kitchen'
import { FRACTIONS, NUMBER_WORDS } from '@/lib/quantities/numbers'
import { finnishWordOf, UNIT_WORDS } from '@/lib/quantities/units'
import type { Case } from '@/lib/quantities/finnish'
import type { KitchenUnit, Measure } from '@/lib/quantities/kitchen'
import type { Language, Value } from '@/lib/quantities/numbers'

// Writes numbers and units the way the recipe's language does: "0,8 dl"
// and "⅓ kuppia" in Finnish, "0.8 dl" and "⅓ cup" in English.

const GLYPHS = Object.entries(FRACTIONS).filter(([, [, denominator]]) =>
  [2, 3, 4, 8].includes(denominator),
)

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6

// "1½", "⅔", "3", or, when written with a slash, "1 1/2" or "1-1/2".
export function formatFraction(
  n: number,
  style: { readonly slash?: boolean; readonly joiner?: string } = {},
): string {
  const whole = Math.floor(n + 1e-9)
  const part = n - whole
  if (close(part, 0)) return String(whole)
  const match = GLYPHS.find(([, [num, den]]) => close(num / den, part))
  if (!match) return formatDecimal(n, 'en', 2)
  const [glyph, [numerator, denominator]] = match
  const fraction = style.slash ? `${numerator}/${denominator}` : glyph
  const joiner = style.joiner ?? (style.slash ? ' ' : '')
  return whole ? `${whole}${joiner}${fraction}` : fraction
}

// "2,4" in Finnish, "2.4" in English, with at most `decimals` decimals.
export function formatDecimal(
  n: number,
  language: Language,
  decimals = 1,
  separator = language === 'fi' ? ',' : '.',
): string {
  const factor = 10 ** decimals
  const rounded = Math.round(n * factor) / factor
  const text = String(rounded === 0 ? 0 : rounded)
  return text.replace('.', separator)
}

export type NumberStyle = 'fraction' | 'decimal' | 'whole'

const STYLES: Record<KitchenUnit, NumberStyle> = {
  ml: 'whole',
  dl: 'decimal',
  l: 'decimal',
  g: 'whole',
  kg: 'decimal',
  mm: 'whole',
  cm: 'decimal',
  tsp: 'fraction',
  tbsp: 'fraction',
  cup: 'fraction',
  quart: 'fraction',
  oz: 'fraction',
  lb: 'fraction',
  in: 'fraction',
}

export function formatNumber(
  n: number,
  style: NumberStyle,
  language: Language,
): string {
  if (style === 'whole') return String(Math.round(n) || 0)
  if (style === 'decimal') return formatDecimal(n, language)
  return formatFraction(n)
}

// A number or a range: "2,4", "¾–1".
export function formatValue(
  value: Value,
  style: NumberStyle,
  language: Language,
): string {
  return typeof value === 'number'
    ? formatNumber(value, style, language)
    : `${formatNumber(value.min, style, language)}–${formatNumber(value.max, style, language)}`
}

// Whether a unit after this value takes its singular: English below or at
// one ("½ cup", "1 cup"), Finnish only at exactly one ("1 kuppi", "½
// kuppia").
export function takesSingular(value: Value, language: Language): boolean {
  const n = maxOf(value)
  return language === 'fi' ? typeof value === 'number' && close(n, 1) : n <= 1
}

// Finnish abbreviations for converted amounts. The other units are written
// as their Finnish word: "⅓ kuppia", "7 unssia".
const FINNISH_ABBREVIATIONS: Partial<Record<KitchenUnit, string>> = {
  ml: 'ml',
  dl: 'dl',
  l: 'l',
  g: 'g',
  kg: 'kg',
  mm: 'mm',
  cm: 'cm',
  tsp: 'tl',
  tbsp: 'rkl',
}

// The unit word after a converted value. A Finnish one takes the case the
// recipe wrote its amount in, or else agrees with the value: "2½ kupissa",
// "¾ tuuman", "2 cm:n", "1 kuppi", "⅓ kuppia".
export function unitLabel(
  unit: KitchenUnit,
  value: Value,
  language: Language,
  form: Case | null = null,
): string {
  if (language === 'en') {
    return unit === 'cup' || unit === 'quart'
      ? pluralize(unit, takesSingular(value, language) ? 1 : 2)
      : unit
  }
  const word = finnishWordOf(unit)
  if (!word) throw new Error(`No Finnish word for ${unit}`)
  const abbreviation = FINNISH_ABBREVIATIONS[unit]
  if (abbreviation) {
    const ending = form ? abbreviationEnding(word, form) : ''
    return ending ? `${abbreviation}:${ending}` : abbreviation
  }
  const agreeing = takesSingular(value, language) ? 'nominative' : 'partitive'
  const inflected =
    form === null || form === 'nominative' || form === 'partitive'
  return inflect(word, inflected ? agreeing : form)
}

// "2,4 dl", "⅓ cup + 1½ tbsp", "⅓ kuppia + 1½ rkl".
export function formatMeasure(
  measure: Measure,
  language: Language,
  form: Case | null = null,
): string {
  return measure
    .map(
      ({ value, unit }) =>
        `${formatValue(value, STYLES[unit], language)} ${unitLabel(unit, value, language, form)}`,
    )
    .join(' + ')
}

// "350°F" in English, "180 °C" in Finnish.
export function formatTemperature(
  value: Value,
  scale: 'C' | 'F',
  language: Language,
): string {
  const number = formatValue(value, 'whole', language)
  return language === 'fi' ? `${number} °${scale}` : `${number}°${scale}`
}

// "23 × 33 cm", "9 × 13 in", "9 × 13 tuumaa".
export function formatDimensions(
  values: ReadonlyArray<Value>,
  unit: 'mm' | 'cm' | 'in',
  language: Language,
  form: Case | null = null,
): string {
  const style = STYLES[unit]
  const numbers = values.map((v) => formatValue(v, style, language))
  const last = values[values.length - 1]
  return `${numbers.join(' × ')} ${unitLabel(unit, last, language, form)}`
}

// The form of a written unit word that agrees with a new value, keeping
// its capital: "cup" → "cups", "Purkki" → "Purkkia". Null when the word
// doesn't change with its number. The recipe's language is tried first,
// since "kilo" is "kilos" in English and "kiloa" in Finnish.
export function agreeingWord(
  word: string,
  value: Value,
  language: Language,
): string | null {
  const lower = word.toLowerCase().replace(/\s+/g, ' ')
  const order: Array<Language> = language === 'fi' ? ['fi', 'en'] : ['en', 'fi']
  for (const lang of order) {
    const pair = UNIT_WORDS[lang].find(([s, p]) => s === lower || p === lower)
    if (!pair) continue
    const form = takesSingular(value, lang) ? pair[0] : pair[1]
    if (form === lower) return null
    return /^\p{Lu}/u.test(word) ? form[0].toUpperCase() + form.slice(1) : form
  }
  return null
}

// A whole number in words, keeping the original's capital: "two",
// "Kolme". Null above the words the parser reads.
export function numberWord(
  n: number,
  like: string,
  language: Language,
): string | null {
  const words = NUMBER_WORDS[language]
  if (!Number.isInteger(n) || n < 1 || n > words.length) return null
  const word = words[n - 1]
  return /^\p{Lu}/u.test(like) ? word[0].toUpperCase() + word.slice(1) : word
}

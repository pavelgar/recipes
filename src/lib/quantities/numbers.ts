import {
  DASH,
  FRACTION_SLASH,
  HYPHEN,
  matchAt,
  SPACE,
} from '@/lib/quantities/text'

export type Language = 'fi' | 'en'

export type Range = { readonly min: number; readonly max: number }

// A single amount, or a range such as 2–3 or ½ to 1.
export type Value = number | Range

// How a number was written, so a scaled amount can be written the same way:
// "2", "1,5" or "1.5", "½" or "1 1/2", "kaksi" or "one".
export type NumberForm = 'integer' | 'decimal' | 'fraction' | 'word'

const FRACTIONS: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
}

export const FRACTION_CHARS = Object.keys(FRACTIONS).join('')

// Where a number may start: a digit or a fraction character.
export const NUMBER_START = new RegExp(`[\\d${FRACTION_CHARS}]`)

const MIXED_FRACTION = new RegExp(
  String.raw`(\d+)${SPACE}*([${FRACTION_CHARS}])`,
  'y',
)
const MIXED_SLASH = new RegExp(
  String.raw`(\d+)${SPACE}+(\d+)${FRACTION_SLASH}(\d+)(?![\d/⁄])`,
  'y',
)
// "1-1/2 cups": a mixed number, since a range can't run from 1 down to ½.
const HYPHEN_MIXED = new RegExp(
  String.raw`(\d+)${HYPHEN}(\d+)${FRACTION_SLASH}(\d+)(?![\d/⁄])`,
  'y',
)
const SLASH = new RegExp(String.raw`(\d+)${FRACTION_SLASH}(\d+)(?![\d/⁄])`, 'y')
const THOUSANDS = /(\d{1,3}(?:,\d{3})+)(?![\d,])/y
// No leading zeros, so the "000" of "1 000 g" isn't read as nothing.
const DECIMAL = /(?:0|[1-9]\d*)(?:[.,]\d+)?(?!\d)/y
const LEADING_POINT = /\.(\d+)/y
const FRACTION = new RegExp(`[${FRACTION_CHARS}]`, 'y')

export type NumberMatch = {
  readonly value: number
  readonly start: number
  readonly end: number
  readonly form: NumberForm
}

// Whether a number may start at pos: not inside a word or another number.
export function atNumberBoundary(text: string, pos: number): boolean {
  if (pos === 0) return true
  const before = text[pos - 1]
  if (/[\p{L}\d]/u.test(before)) return false
  // "öljyä,1 rkl" and "180C/350F" start a number, the 5 in "1,5" and the 2
  // in "1/2" don't.
  return !(/[.,/⁄]/.test(before) && pos >= 2 && /\d/.test(text[pos - 2]))
}

// Whether a numerator and denominator make a fraction below one.
const isProper = (numerator: string, denominator: string) =>
  Number(denominator) !== 0 && Number(numerator) < Number(denominator)

// Reads one number at pos: 2, 1,5, 1.5, ½, 1/2, 1½, 1 ½, 1 1/2, 1-1/2, .25,
// "1 and 1/2", "2 and a half" and, in English, 1,000.
export function readNumber(
  text: string,
  pos: number,
  language: Language,
): NumberMatch | null {
  const at = (value: number, length: number, form: NumberForm) => ({
    value,
    start: pos,
    end: pos + length,
    form,
  })
  let m = matchAt(MIXED_FRACTION, text, pos)
  if (m) return at(Number(m[1]) + FRACTIONS[m[2]], m[0].length, 'fraction')
  m = matchAt(MIXED_SLASH, text, pos) ?? matchAt(HYPHEN_MIXED, text, pos)
  if (m && isProper(m[2], m[3])) {
    const value = Number(m[1]) + Number(m[2]) / Number(m[3])
    return at(value, m[0].length, 'fraction')
  }
  m = matchAt(SLASH, text, pos)
  // "380/230 g" is a can's net and drained weight, not a fraction.
  if (m && isProper(m[1], m[2]) && Number(m[2]) <= 64) {
    return at(Number(m[1]) / Number(m[2]), m[0].length, 'fraction')
  }
  if (language === 'en') {
    m = matchAt(THOUSANDS, text, pos)
    if (m) return at(Number(m[1].replace(/,/g, '')), m[0].length, 'integer')
  }
  m = matchAt(DECIMAL, text, pos)
  if (m) {
    const value = Number(m[0].replace(',', '.'))
    const end = pos + m[0].length
    if (!Number.isInteger(value)) return at(value, m[0].length, 'decimal')
    const half = readAndFraction(text, end, language)
    return half
      ? at(value + half.value, half.end - pos, 'fraction')
      : at(value, m[0].length, /[.,]/.test(m[0]) ? 'decimal' : 'integer')
  }
  m = matchAt(LEADING_POINT, text, pos)
  if (m) return at(Number(`0.${m[1]}`), m[0].length, 'decimal')
  m = matchAt(FRACTION, text, pos)
  if (m) return at(FRACTIONS[m[0]], 1, 'fraction')
  return null
}

const AND_FRACTION: Record<Language, RegExp> = {
  en: new RegExp(
    String.raw`${SPACE}+and${SPACE}+(?:a${SPACE}+half|(\d+)${FRACTION_SLASH}(\d+)|([${FRACTION_CHARS}]))(?![\p{L}\d/⁄])`,
    'iuy',
  ),
  fi: new RegExp(String.raw`${SPACE}+ja${SPACE}+puoli(?![\p{L}\d])`, 'iuy'),
}

// Reads the fraction that follows a whole number in words: "1 and 1/2",
// "one and a half", "kaksi ja puoli".
function readAndFraction(
  text: string,
  pos: number,
  language: Language,
): { value: number; end: number } | null {
  const m = matchAt(AND_FRACTION[language], text, pos)
  if (!m) return null
  const end = pos + m[0].length
  // Groups that didn't take part in the match are undefined.
  const numerator = m.at(1)
  const denominator = m.at(2)
  const fraction = m.at(3)
  if (numerator !== undefined && denominator !== undefined) {
    return isProper(numerator, denominator)
      ? { value: Number(numerator) / Number(denominator), end }
      : null
  }
  return { value: fraction === undefined ? 0.5 : FRACTIONS[fraction], end }
}

// A dash, or "to", "or" or "tai", which may follow a hyphen left hanging
// from the first number: "7- or 8-oz".
const RANGE_SEPARATOR = new RegExp(
  String.raw`${SPACE}*(?:(?:${DASH}${SPACE}*)?(?:to|or|tai)(?=${SPACE})|${DASH})${SPACE}*`,
  'iy',
)

// Reads the separator of a range at pos, returning its end.
export function readRangeSeparator(text: string, pos: number): number | null {
  const m = matchAt(RANGE_SEPARATOR, text, pos)
  return m ? pos + m[0].length : null
}

export function makeRange(min: number, max: number): Value | null {
  return max > min ? { min, max } : null
}

const NUMBER_WORDS: Record<Language, Record<string, number>> = {
  fi: {
    yksi: 1,
    kaksi: 2,
    kolme: 3,
    neljä: 4,
    viisi: 5,
    kuusi: 6,
    seitsemän: 7,
    kahdeksan: 8,
    yhdeksän: 9,
    kymmenen: 10,
    puoli: 0.5,
    puolikas: 0.5,
    puolitoista: 1.5,
  },
  en: {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    'half a': 0.5,
    'half an': 0.5,
    half: 0.5,
    a: 1,
    an: 1,
  },
}

const NUMBER_WORD: Record<Language, RegExp> = {
  fi: wordRegExp(Object.keys(NUMBER_WORDS.fi)),
  en: wordRegExp(Object.keys(NUMBER_WORDS.en)),
}

function wordRegExp(words: Array<string>) {
  const alternatives = [...words]
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/ /g, `${SPACE}+`))
    .join('|')
  return new RegExp(String.raw`(?:${alternatives})(?![\p{L}\d])`, 'iuy')
}

export type NumberWordMatch = NumberMatch & {
  // "a" and "an" only count as one when a unit follows.
  readonly article: boolean
}

export function readNumberWord(
  text: string,
  pos: number,
  language: Language,
): NumberWordMatch | null {
  if (!atNumberBoundary(text, pos)) return null
  const m = matchAt(NUMBER_WORD[language], text, pos)
  if (!m) return null
  const word = m[0].toLowerCase().replace(/\s+/g, ' ')
  const value = NUMBER_WORDS[language][word]
  const article = word === 'a' || word === 'an'
  const end = pos + m[0].length
  const half =
    Number.isInteger(value) && !article
      ? readAndFraction(text, end, language)
      : null
  return half
    ? {
        value: value + half.value,
        start: pos,
        end: half.end,
        form: 'word',
        article,
      }
    : { value, start: pos, end, form: 'word', article }
}

// Words that make an amount approximate. They stay in the text as written.
const APPROXIMATELY = new RegExp(
  String.raw`(?:n\.|n(?=${SPACE}+[\d${FRACTION_CHARS}])|noin|vajaat?|reilut?|runsaat|runsas|ca\.|about|approx\.?|approximately|around|scant|heaped|heaping|generous|~)(?![\p{L}])${SPACE}*`,
  'iuy',
)

// Reads a word that makes the amount after it approximate, returning where
// the amount starts.
export function readApproximately(text: string, pos: number): number | null {
  if (text[pos] !== '~' && !atNumberBoundary(text, pos)) return null
  const m = matchAt(APPROXIMATELY, text, pos)
  return m ? pos + m[0].length : null
}

// Whether an approximate word sits right before pos: "about 400g", "n. 5dl".
export function approximateBefore(text: string, pos: number): boolean {
  for (let start = Math.max(0, pos - 16); start < pos; start++) {
    if (readApproximately(text, start) === pos) return true
  }
  return false
}

export type Language = 'fi' | 'en'

export type Range = { readonly min: number; readonly max: number }

// A single amount, or a range such as 2–3 or ½ to 1.
export type Value = number | Range

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

const SPACE = String.raw`[ \t\u00a0\u2009\u202f]`
const MIXED_FRACTION = new RegExp(
  String.raw`(\d+)${SPACE}*([${FRACTION_CHARS}])`,
  'y',
)
const MIXED_SLASH = new RegExp(
  String.raw`(\d+)${SPACE}+(\d+)[/⁄](\d+)(?![\d/⁄])`,
  'y',
)
const SLASH = /(\d+)[/⁄](\d+)(?![\d/⁄])/y
const THOUSANDS = /(\d{1,3}(?:,\d{3})+)(?![\d,])/y
const DECIMAL = /\d+(?:[.,]\d+)?/y
const LEADING_POINT = /\.(\d+)/y
const FRACTION = new RegExp(`[${FRACTION_CHARS}]`, 'y')

export type NumberMatch = { value: number; start: number; end: number }

function exec(re: RegExp, text: string, pos: number) {
  re.lastIndex = pos
  return re.exec(text)
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

// Reads one number at pos: 2, 1,5, 1.5, ½, 1/2, 1½, 1 ½, 1 1/2, .25 and, in
// English, 1,000.
export function readNumber(
  text: string,
  pos: number,
  language: Language,
): NumberMatch | null {
  let m = exec(MIXED_FRACTION, text, pos)
  if (m) {
    return {
      value: Number(m[1]) + FRACTIONS[m[2]],
      start: pos,
      end: pos + m[0].length,
    }
  }
  m = exec(MIXED_SLASH, text, pos)
  if (m && Number(m[3]) !== 0 && Number(m[2]) < Number(m[3])) {
    return {
      value: Number(m[1]) + Number(m[2]) / Number(m[3]),
      start: pos,
      end: pos + m[0].length,
    }
  }
  m = exec(SLASH, text, pos)
  if (m && Number(m[2]) !== 0) {
    return {
      value: Number(m[1]) / Number(m[2]),
      start: pos,
      end: pos + m[0].length,
    }
  }
  if (language === 'en') {
    m = exec(THOUSANDS, text, pos)
    if (m) {
      return {
        value: Number(m[1].replace(/,/g, '')),
        start: pos,
        end: pos + m[0].length,
      }
    }
  }
  m = exec(DECIMAL, text, pos)
  if (m) {
    return {
      value: Number(m[0].replace(',', '.')),
      start: pos,
      end: pos + m[0].length,
    }
  }
  m = exec(LEADING_POINT, text, pos)
  if (m) {
    return { value: Number(`0.${m[1]}`), start: pos, end: pos + m[0].length }
  }
  m = exec(FRACTION, text, pos)
  if (m) {
    return { value: FRACTIONS[m[0]], start: pos, end: pos + 1 }
  }
  return null
}

const RANGE_SEPARATOR = new RegExp(
  String.raw`${SPACE}*(?:-|–|—|to(?=${SPACE}))${SPACE}*`,
  'iy',
)

// Reads the separator of a range (-, –, — or "to") at pos, returning its end.
export function readRangeSeparator(text: string, pos: number): number | null {
  const m = exec(RANGE_SEPARATOR, text, pos)
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
  article: boolean
}

export function readNumberWord(
  text: string,
  pos: number,
  language: Language,
): NumberWordMatch | null {
  if (!atNumberBoundary(text, pos)) return null
  const m = exec(NUMBER_WORD[language], text, pos)
  if (!m) return null
  const word = m[0].toLowerCase().replace(/\s+/g, ' ')
  return {
    value: NUMBER_WORDS[language][word],
    start: pos,
    end: pos + m[0].length,
    article: word === 'a' || word === 'an',
  }
}

// Words that make an amount approximate. They stay in the text as written.
const APPROXIMATELY = new RegExp(
  String.raw`(?:n\.|n(?=${SPACE}+[\d${FRACTION_CHARS}])|noin|vajaat?|reilut?|runsaat|runsas|ca\.|about|approx\.?|approximately|around|scant|heaped|heaping|generous|~)(?![\p{L}])${SPACE}*`,
  'iuy',
)

export function readApproximately(text: string, pos: number): number | null {
  if (text[pos] !== '~' && !atNumberBoundary(text, pos)) return null
  const m = exec(APPROXIMATELY, text, pos)
  return m ? pos + m[0].length : null
}

export function skipSpace(text: string, pos: number): number {
  while (pos < text.length && /\s/.test(text[pos])) pos++
  return pos
}

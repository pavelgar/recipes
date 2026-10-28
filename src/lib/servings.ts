// Servings as recipes write them ("4 annosta", "24 pullaa", "Serves 8-10",
// "one 9" x 4" loaf"), and how they read once scaled: the numbers that
// count change, written the way they were, and the words and sizes stay.

import {
  formatDecimal,
  formatFraction,
  numberWord,
} from '@/lib/quantities/format'
import {
  atNumberBoundary,
  NUMBER_START,
  readNumber,
  readNumberWord,
} from '@/lib/quantities/numbers'
import { canonical } from '@/lib/quantities/text'
import type { Language, NumberMatch } from '@/lib/quantities/numbers'

// What follows the size of what's made rather than a count of it: a
// length ('9"', "9 inch", "23 cm"), one side of "9x13", or a word the
// number is joined to ("9-inch", "1 1/2-pound", "2-layer").
const SIZE_AFTER =
  /^(?:\s*(?:"|inch|in\.|cm\b|mm\b|tuuma)|-\p{L}|\s*[x×]\s*\d)/iu
// The other side of "9 x 13".
const SIZE_BEFORE = /[x×]\s*$/i

// Reads a number at pos: digits in any language, number words ("one",
// "kaksi") in the languages the app reads.
function readAt(
  text: string,
  pos: number,
  language: Language | null,
): NumberMatch | null {
  if (!atNumberBoundary(text, pos)) return null
  if (NUMBER_START.test(text[pos])) {
    return readNumber(text, pos, language ?? 'fi')
  }
  if (language === null) return null
  const word = readNumberWord(text, pos, language)
  // "a" counts only before a unit, which servings don't have: "a crowd".
  return word && !word.article ? word : null
}

// The numbers in the servings that count what the recipe makes, and so
// scale: every number but sizes.
function countsIn(
  written: string,
  language: Language | null,
): Array<NumberMatch> {
  const text = canonical(written)
  const counts: Array<NumberMatch> = []
  let pos = 0
  while (pos < text.length) {
    const found = readAt(text, pos, language)
    if (!found) {
      pos++
      continue
    }
    const size =
      SIZE_AFTER.test(text.slice(found.end)) ||
      SIZE_BEFORE.test(text.slice(0, found.start))
    if (!size) counts.push(found)
    pos = found.end
  }
  return counts
}

// The number the servings give, the first of a range: 8 in "Serves 8-10",
// 1 in "one 9" x 4" loaf". Null when they give none ("a crowd").
export function servingsCount(
  written: string | null,
  language: Language | null,
): number | null {
  if (!written) return null
  return countsIn(written, language).at(0)?.value ?? null
}

// A count as the recipe's language writes it, to one decimal: "2,5" in
// Finnish, "2.5" in English.
export function formatCount(count: number, language: Language | null): string {
  return formatDecimal(count, language ?? 'en')
}

// A scaled count written as the original was: a word stays a word ("two"),
// a fraction a fraction ("1 1/2", "2½"), while there is one for it;
// otherwise a decimal.
function writeLike(
  original: string,
  { form }: NumberMatch,
  value: number,
  language: Language | null,
): string {
  if (form === 'word' && language !== null) {
    return numberWord(value, original, language) ?? formatCount(value, language)
  }
  if (form === 'fraction') {
    const fraction = formatFraction(value, {
      slash: original.includes('/'),
      joiner: original.includes('-') ? '-' : undefined,
    })
    // Without a fraction glyph for it, formatFraction falls back to a
    // decimal in English.
    if (!fraction.includes('.')) return fraction
  }
  return formatCount(value, language)
}

// The servings scaled by a factor, every count in them, so a range scales
// at both ends: "Serves 8-10" × 1.5 is "Serves 12-15". Sizes stay: "1 -
// 9x13 inch pan" × 2 is "2 - 9x13 inch pan".
export function scaleServings(
  written: string,
  factor: number,
  language: Language | null,
): string {
  let out = ''
  let last = 0
  // The canonical copy has the same positions as what's written.
  for (const count of countsIn(written, language)) {
    const original = written.slice(count.start, count.end)
    out += written.slice(last, count.start)
    out += writeLike(original, count, count.value * factor, language)
    last = count.end
  }
  return out + written.slice(last)
}

// How far one tap moves the servings: whole servings from 4 up, halves for
// smaller recipes, and whole multiples when the servings give no number.
export function servingsStep(count: number | null): number {
  if (count === null) return 1
  return count >= 4 ? 1 : 0.5
}

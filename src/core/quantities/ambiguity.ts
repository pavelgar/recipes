import { endOf, textBefore } from '@/core/quantities/text'
import type { Language } from '@/core/quantities/numbers'
import type { UnitMatch } from '@/core/quantities/units'

// The rules that pick between two readings of the same text, in one place.
// Each names the corpus lines it was written for; ambiguity.test.ts checks
// them both ways.

// A unit word followed by a hyphen and a letter is usually part of another
// word. "19cm-square" is centimetres, but "2 in-season peaches", "2
// L-kokoista kananmunaa" and "1 T-bone steak" aren't inches, litres or
// tablespoons.
const NOT_BEFORE_HYPHEN = new Set(['in', 'l', 't', 'c'])

export function mayPrecedeHyphen(word: string): boolean {
  return !NOT_BEFORE_HYPHEN.has(word.toLowerCase())
}

// What makes a bare "in" inches: a full stop or other punctuation, the end
// of the text, "x" or "by", or a word for a size or a shape ("2 in. apart",
// "2 in pieces", "a 9 in square pan"). "Put 2 in the pan" isn't inches.
const INCHES_FOLLOW = new RegExp(
  String.raw` *(?:[.,;:)/]|$|[x×](?![\p{L}]))| +(?:by|apart|across|thick|thickness|thin|wide|long|deep|high|tall|diameter|square|round|pieces?|cubes?|chunks?|slices?|strips?|rounds?|squares?|lengths?|circles?|rectangles?|pans?|tins?|dish|dishes|skillets?|rings?|cutters?|ramekins?|moulds?|molds?|loaf|cakes?|pies?|tarts?|springform|baking)(?![\p{L}])`,
  'iuy',
)

export function isBareIn(text: string, unit: UnitMatch): boolean {
  return text.slice(unit.start, unit.end).toLowerCase() === 'in'
}

// Whether a unit read after a number with a space between ("2 in", '2 "')
// really is inches. Inch marks only count glued to the number ('1/3" wide'),
// and a bare "in" only before a size word: "Shape dough into 1-in. balls;
// place 2 in. apart" but not "Wrap two in cling film".
export function spacedInchesHold(text: string, unit: UnitMatch): boolean {
  if (text[unit.start] === '"') return false
  return !isBareIn(text, unit) || endOf(INCHES_FOLLOW, text, unit.end) !== null
}

// A bare C or F after a number is a temperature only from 25 up (or below
// zero), so "2 C" stays cups: "Laita taikina uuniin ja paista 200 C".
export function scaleLetterIsTemperature(value: number): boolean {
  return value >= 25 || value < 0
}

const TURNING = /rotat|turn|käänn|kierr/i
const ANGLES = new Set([45, 90, 180, 270, 360])
// Signs that a degree with no scale is a temperature after all: "turn the
// oven to 180°", "kierrä uuni 180°:een".
const OVEN = /\b(?:oven|uuni\p{L}*)\b/iu
const TO_BEFORE = /\b(?:to|at|until)\s*$/i

// Whether a number with a degree sign and no scale is an angle: "Bake 65
// minutes, rotating tray 180° at 45 minutes", "turn it 90°".
export function isTurn(
  text: string,
  start: number,
  end: number,
  value: number,
): boolean {
  const around = text.slice(Math.max(0, start - 30), end + 20)
  return (
    ANGLES.has(value) &&
    TURNING.test(around) &&
    !OVEN.test(around) &&
    !TO_BEFORE.test(textBefore(text, start)) &&
    text[end] !== ':'
  )
}

// "3 x 20cm cake tins" is three tins, not a size of 3 by 20 cm: "Grease and
// line the base and sides of 3 x 20cm cake tins".
const COUNTED_ITEMS =
  /^[^.;,]{0,30}?\b(?:tins|pans|sheets|trays|dishes|moulds|molds|ramekins)\b/i

export function countsItems(
  text: string,
  end: number,
  values: ReadonlyArray<number>,
  language: Language,
): boolean {
  return (
    language === 'en' &&
    values.length === 2 &&
    Number.isInteger(values[0]) &&
    values[0] <= 6 &&
    COUNTED_ITEMS.test(text.slice(end, end + 80))
  )
}

// "mm" is maustemitta (1 ml) as the first amount of a Finnish ingredient
// line, and millimetres anywhere else: "cut into 5mm/¼in thick slices".
export function isMaustemitta(
  text: string,
  unitAt: readonly [number, number] | null,
  language: Language,
  leading: boolean,
): boolean {
  return (
    leading &&
    language === 'fi' &&
    unitAt !== null &&
    text.slice(unitAt[0], unitAt[1]).toLowerCase() === 'mm'
  )
}

// "a" or "an" before a unit is an amount only with "of" after it: "Use a
// tablespoon or so of the sauce", but not "A tablespoon cookie scoop works
// well here".
const ARTICLE_OF = /\s+(?:or so\s+)?of\b/iy

export function articleCounts(text: string, end: number): boolean {
  return endOf(ARTICLE_OF, text, end) !== null
}

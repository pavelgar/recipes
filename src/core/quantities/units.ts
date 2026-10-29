import { escapeRegExp } from 'es-toolkit'
import pluralize from 'pluralize'
import { mayPrecedeHyphen } from '@/core/quantities/ambiguity'
import { inflect, MEASURE_CASES } from '@/core/quantities/finnish'
import { matchAt } from '@/core/quantities/text'
import type { Case, FinnishWord } from '@/core/quantities/finnish'
import type { Language } from '@/core/quantities/numbers'

export type UnitKind =
  'volume' | 'weight' | 'length' | 'package' | 'count' | 'pinch'

// The unit words the parser accepts, Finnish and English together, since
// a recipe may mix units. Matched in any case.
//
// - short: abbreviations and symbols, which don't change with their number.
// - en: English singulars; pluralize supplies the plurals.
// - fi: Finnish words, nominative, genitive and partitive: "1 purkki", "1,5
//   litran vuoka", "2 purkkia". Measures (volumes, weights and lengths)
//   are read in the other cases too: "6 desissä vettä", see finnish.ts.
//   The first word is the one converted amounts are written with.
//
// "mm" is read as millimetres here; as the first amount of a Finnish
// ingredient line it is maustemitta instead, see isMaustemitta.
// prettier-ignore
export const UNITS = [
  // Volume
  { id: 'ml', kind: 'volume', short: ['ml'], fi: [['millilitra', 'millilitran', 'millilitraa']], en: ['millilitre', 'milliliter'] },
  { id: 'cl', kind: 'volume', short: ['cl'], fi: [['senttilitra', 'senttilitran', 'senttilitraa']], en: ['centilitre', 'centiliter'] },
  { id: 'dl', kind: 'volume', short: ['dl'], fi: [['desilitra', 'desilitran', 'desilitraa'], ['desi', 'desin', 'desiä']], en: ['decilitre', 'deciliter'] },
  { id: 'l', kind: 'volume', short: ['l', 'ltr'], fi: [['litra', 'litran', 'litraa']], en: ['litre', 'liter'] },
  { id: 'tsp', kind: 'volume', short: ['tl', 'tsp', 'tsps'], fi: [['teelusikallinen', 'teelusikallisen', 'teelusikallista'], ['teelusikka', 'teelusikan', 'teelusikkaa']], en: ['teaspoon'] },
  { id: 'tbsp', kind: 'volume', short: ['rkl', 'rk', 'tbsp', 'tbsps', 'tbs'], fi: [['ruokalusikallinen', 'ruokalusikallisen', 'ruokalusikallista'], ['ruokalusikka', 'ruokalusikan', 'ruokalusikkaa']], en: ['tablespoon'] },
  { id: 'maustemitta', kind: 'volume', fi: [['maustemitta', 'maustemitan', 'maustemittaa'], ['maustemitallinen', 'maustemitallisen', 'maustemitallista']] },
  { id: 'cup', kind: 'volume', fi: [['kuppi', 'kupin', 'kuppia'], ['kupillinen', 'kupillisen', 'kupillista']], en: ['cup'] },
  { id: 'fl-oz', kind: 'volume', short: ['fl oz', 'fl. oz', 'fl.oz'], fi: [['nesteunssi', 'nesteunssin', 'nesteunssia']], en: ['fluid ounce'] },
  { id: 'pint', kind: 'volume', short: ['pt'], fi: [['pintti', 'pintin', 'pinttiä']], en: ['pint'] },
  { id: 'quart', kind: 'volume', short: ['qt'], fi: [['neljännesgallona', 'neljännesgallonan', 'neljännesgallonaa']], en: ['quart'] },
  { id: 'gallon', kind: 'volume', fi: [['gallona', 'gallonan', 'gallonaa']], en: ['gallon'] },
  // Weight
  { id: 'g', kind: 'weight', short: ['g', 'gr'], fi: [['gramma', 'gramman', 'grammaa']], en: ['gram', 'gramme'] },
  { id: 'kg', kind: 'weight', short: ['kg'], fi: [['kilo', 'kilon', 'kiloa'], ['kilogramma', 'kilogramman', 'kilogrammaa']], en: ['kilo', 'kilogram'] },
  { id: 'oz', kind: 'weight', short: ['oz'], fi: [['unssi', 'unssin', 'unssia']], en: ['ounce'] },
  { id: 'lb', kind: 'weight', short: ['lb', 'lbs'], fi: [['pauna', 'paunan', 'paunaa']], en: ['pound'] },
  // Length
  { id: 'mm', kind: 'length', short: ['mm'], fi: [['millimetri', 'millimetrin', 'millimetriä']], en: ['millimetre', 'millimeter'] },
  { id: 'cm', kind: 'length', short: ['cm'], fi: [['senttimetri', 'senttimetrin', 'senttimetriä'], ['sentti', 'sentin', 'senttiä']], en: ['centimetre', 'centimeter'] },
  { id: 'in', kind: 'length', short: ['in'], fi: [['tuuma', 'tuuman', 'tuumaa']], en: ['inch'] },
  // Packages
  { id: 'prk', kind: 'package', short: ['prk'], fi: [['purkki', 'purkin', 'purkkia']] },
  { id: 'pss', kind: 'package', short: ['pss', 'ps'], fi: [['pussi', 'pussin', 'pussia']] },
  { id: 'pkt', kind: 'package', short: ['pkt'], fi: [['paketti', 'paketin', 'pakettia'], ['pakkaus', 'pakkauksen', 'pakkausta']] },
  { id: 'rs', kind: 'package', short: ['rs'], fi: [['rasia', 'rasian', 'rasiaa']] },
  { id: 'tlk', kind: 'package', short: ['tlk'], fi: [['tölkki', 'tölkin', 'tölkkiä'], ['tölkillinen', 'tölkillisen', 'tölkillistä']] },
  { id: 'plo', kind: 'package', short: ['plo'], fi: [['pullo', 'pullon', 'pulloa']] },
  { id: 'rku', kind: 'package', short: ['rku'], fi: [['ruukku', 'ruukun', 'ruukkua']] },
  { id: 'can', kind: 'package', en: ['can', 'tin'] },
  { id: 'package', kind: 'package', short: ['pkg'], en: ['package', 'packet', 'pack'] },
  { id: 'jar', kind: 'package', en: ['jar'] },
  { id: 'carton', kind: 'package', en: ['carton'] },
  { id: 'container', kind: 'package', en: ['container'] },
  { id: 'tub', kind: 'package', en: ['tub'] },
  { id: 'bottle', kind: 'package', en: ['bottle'] },
  { id: 'bag', kind: 'package', en: ['bag'] },
  { id: 'box', kind: 'package', en: ['box'] },
  { id: 'block', kind: 'package', en: ['block'] },
  { id: 'stick', kind: 'package', en: ['stick'] },
  // Counts
  { id: 'kpl', kind: 'count', short: ['kpl'], fi: [['kappale', 'kappaleen', 'kappaletta']] },
  { id: 'nippu', kind: 'count', fi: [['nippu', 'nipun', 'nippua']] },
  { id: 'oksa', kind: 'count', fi: [['oksa', 'oksan', 'oksaa']] },
  { id: 'kynsi', kind: 'count', fi: [['kynsi', 'kynnen', 'kynttä']] },
  { id: 'viipale', kind: 'count', fi: [['viipale', 'viipaleen', 'viipaletta'], ['siivu', 'siivun', 'siivua']] },
  { id: 'pala', kind: 'count', fi: [['pala', 'palan', 'palaa']] },
  { id: 'levy', kind: 'count', fi: [['levy', 'levyn', 'levyä']] },
  { id: 'clove', kind: 'count', en: ['clove'] },
  { id: 'slice', kind: 'count', en: ['slice'] },
  { id: 'bunch', kind: 'count', en: ['bunch'] },
  { id: 'sprig', kind: 'count', en: ['sprig'] },
  { id: 'head', kind: 'count', fi: [['pää', 'pään', 'päätä']], en: ['head'] },
  { id: 'stalk', kind: 'count', en: ['stalk'] },
  { id: 'rib', kind: 'count', en: ['rib'] },
  { id: 'ear', kind: 'count', en: ['ear'] },
  { id: 'piece', kind: 'count', en: ['piece'] },
  { id: 'sheet', kind: 'count', en: ['sheet'] },
  // Pinches
  { id: 'ripaus', kind: 'pinch', fi: [['ripaus', 'ripauksen', 'ripausta']] },
  { id: 'hyppysellinen', kind: 'pinch', fi: [['hyppysellinen', 'hyppysellisen', 'hyppysellistä']] },
  { id: 'tilkka', kind: 'pinch', fi: [['tilkka', 'tilkan', 'tilkkaa']] },
  { id: 'loraus', kind: 'pinch', fi: [['loraus', 'lorauksen', 'lorausta']] },
  { id: 'tippa', kind: 'pinch', fi: [['tippa', 'tipan', 'tippaa']] },
  { id: 'kourallinen', kind: 'pinch', fi: [['kourallinen', 'kourallisen', 'kourallista']] },
  { id: 'pinch', kind: 'pinch', en: ['pinch'] },
  { id: 'dash', kind: 'pinch', en: ['dash'] },
  { id: 'handful', kind: 'pinch', en: ['handful'] },
  { id: 'knob', kind: 'pinch', en: ['knob'] },
  { id: 'drop', kind: 'pinch', en: ['drop'] },
  { id: 'splash', kind: 'pinch', en: ['splash'] },
] as const satisfies ReadonlyArray<{
  id: string
  kind: UnitKind
  short?: ReadonlyArray<string>
  en?: ReadonlyArray<string>
  fi?: ReadonlyArray<FinnishWord>
}>

export type UnitId = (typeof UNITS)[number]['id']

export type Unit = { readonly id: UnitId; readonly kind: UnitKind }

type Entry = (typeof UNITS)[number]
const shortOf = (u: Entry): ReadonlyArray<string> =>
  'short' in u ? u.short : []
const englishOf = (u: Entry): ReadonlyArray<readonly [string, string]> =>
  ('en' in u ? u.en : []).map((word) => [word, pluralize(word)] as const)
const finnishOf = (u: Entry): ReadonlyArray<FinnishWord> =>
  'fi' in u ? u.fi : []

// Single letters that US recipes use for spoons and cups, matched only in
// this case and only in English: "1 T butter", "2 t salt", "1 c flour".
const LETTER_UNITS: Record<string, UnitId> = {
  T: 'tbsp',
  t: 'tsp',
  c: 'cup',
  C: 'cup',
}

// The singular and plural of each unit word that changes with its number,
// so a scaled amount stays grammatical: "1 cup" → "2 cups", "1 purkki" → "2
// purkkia". English takes the plural above one; Finnish takes the partitive
// for anything but exactly one. Abbreviations ("dl", "tbsp") and the other
// Finnish cases ("1,5 litran vuoka", "2 desissä") don't change.
export const UNIT_WORDS: Record<
  Language,
  ReadonlyArray<readonly [singular: string, plural: string]>
> = {
  en: UNITS.flatMap(englishOf),
  fi: UNITS.flatMap((u) =>
    finnishOf(u).map(
      ([nominative, , partitive]) => [nominative, partitive] as const,
    ),
  ),
}

// What a measure is counted in: millilitres, grams or millimetres. Null for
// packages, counts and pinches.
export type Dimension = 'volume' | 'weight' | 'length'

export function dimensionOf(unit: Unit): Dimension | null {
  return unit.kind === 'volume' ||
    unit.kind === 'weight' ||
    unit.kind === 'length'
    ? unit.kind
    : null
}

export function isMeasure(unit: Unit | null): boolean {
  return unit !== null && dimensionOf(unit) !== null
}

const byId = new Map<UnitId, Unit>()
const byForm = new Map<string, Unit>()
// The case of each Finnish form that isn't the nominative or partitive.
const finnishCases = new Map<string, Case>()
for (const entry of UNITS) {
  const unit: Unit = { id: entry.id, kind: entry.kind }
  byId.set(entry.id, unit)
  const forms = [...shortOf(entry), ...englishOf(entry).flat()]
  for (const word of finnishOf(entry)) {
    const cases: ReadonlyArray<Case> = isMeasure(unit)
      ? ['nominative', 'genitive', 'partitive', ...MEASURE_CASES]
      : ['nominative', 'genitive', 'partitive']
    for (const form of cases) {
      const written = inflect(word, form)
      forms.push(written)
      if (form !== 'nominative' && form !== 'partitive') {
        finnishCases.set(written, form)
      }
    }
  }
  for (const form of forms) byForm.set(form, unit)
}

// Every form a unit is read in.
export function formsOf(id: UnitId): Array<string> {
  return [...byForm].filter(([, unit]) => unit.id === id).map(([form]) => form)
}

// The Finnish case of a unit word as written, when it is neither the
// nominative nor the partitive: "desissä" → inessive, "litran" → genitive.
export function caseOfUnitWord(word: string): Case | null {
  return finnishCases.get(word.toLowerCase()) ?? null
}

// The word a converted amount in this unit is written with in Finnish:
// "kuppi", and for an abbreviation the word it is read as, "desilitra".
export function finnishWordOf(id: UnitId): FinnishWord | null {
  const entry = UNITS.find((u) => u.id === id)
  return entry ? (finnishOf(entry).at(0) ?? null) : null
}

export function unitById(id: UnitId): Unit {
  const unit = byId.get(id)
  if (!unit) throw new Error(`Unknown unit ${id}`)
  return unit
}

// Longest forms first, so "tbsp" wins over "tbs" and "fl oz" over "fl".
const wordPattern = [...byForm.keys()]
  .sort((a, b) => b.length - a.length)
  .map((form) => escapeRegExp(form).replace(/ /g, '\\s+'))
  .join('|')

// A unit word ends where the word ends.
const UNIT_WORD = new RegExp(String.raw`(?:${wordPattern})(?![\p{L}\d])`, 'iuy')
const LETTER_UNIT = new RegExp(
  String.raw`[${Object.keys(LETTER_UNITS).join('')}](?![\p{L}\d])`,
  'uy',
)
const INCH_MARK = /"/y
const HYPHEN_WORD = /-\p{L}/uy

export type UnitMatch = {
  readonly unit: Unit
  readonly start: number
  readonly end: number
}

export function readUnit(
  text: string,
  pos: number,
  language: Language,
): UnitMatch | null {
  if (matchAt(INCH_MARK, text, pos)) {
    return { unit: unitById('in'), start: pos, end: pos + 1 }
  }
  const m =
    matchAt(UNIT_WORD, text, pos) ??
    (language === 'en' ? matchAt(LETTER_UNIT, text, pos) : null)
  if (!m) return null
  const end = pos + m[0].length
  if (!mayPrecedeHyphen(m[0]) && matchAt(HYPHEN_WORD, text, end)) return null
  const unit =
    byForm.get(m[0].toLowerCase().replace(/\s+/g, ' ')) ??
    (m[0] in LETTER_UNITS ? unitById(LETTER_UNITS[m[0]]) : undefined)
  return unit ? { unit, start: pos, end } : null
}

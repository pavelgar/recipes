import { mayPrecedeHyphen } from '@/lib/quantities/ambiguity'
import { HYPHEN, INCH_MARK, matchAt } from '@/lib/quantities/text'
import type { Language } from '@/lib/quantities/numbers'

export type UnitKind =
  'volume' | 'weight' | 'length' | 'package' | 'count' | 'pinch'

// Every spelling the parser accepts, Finnish and English together, since a
// recipe may mix units. Matched in any case. Finnish forms cover the
// nominative (1 purkki), the partitive used after other numbers (2 purkkia)
// and the genitive (1,5 litran vuoka). "mm" is read as millimetres here; as
// the first amount of a Finnish ingredient line it is maustemitta instead,
// see isMaustemitta.
// prettier-ignore
export const UNITS = [
  // Volume
  { id: 'ml', kind: 'volume', forms: ['ml', 'millilitra', 'millilitraa', 'millilitran', 'millilitre', 'millilitres', 'milliliter', 'milliliters'] },
  { id: 'cl', kind: 'volume', forms: ['cl', 'senttilitra', 'senttilitraa', 'senttilitran', 'centilitre', 'centilitres', 'centiliter', 'centiliters'] },
  { id: 'dl', kind: 'volume', forms: ['dl', 'desilitra', 'desilitraa', 'desilitran', 'desi', 'desiä', 'decilitre', 'decilitres', 'deciliter', 'deciliters'] },
  { id: 'l', kind: 'volume', forms: ['l', 'ltr', 'litra', 'litraa', 'litran', 'litre', 'litres', 'liter', 'liters'] },
  { id: 'tsp', kind: 'volume', forms: ['tl', 'teelusikallinen', 'teelusikallista', 'teelusikallisen', 'teelusikka', 'teelusikkaa', 'tsp', 'tsps', 'teaspoon', 'teaspoons'] },
  { id: 'tbsp', kind: 'volume', forms: ['rkl', 'rk', 'ruokalusikallinen', 'ruokalusikallista', 'ruokalusikallisen', 'ruokalusikka', 'ruokalusikkaa', 'tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons'] },
  { id: 'maustemitta', kind: 'volume', forms: ['maustemitta', 'maustemittaa', 'maustemitallinen', 'maustemitallista'] },
  { id: 'cup', kind: 'volume', forms: ['kuppi', 'kuppia', 'kupin', 'kupillinen', 'kupillista', 'kupillisen', 'cup', 'cups'] },
  { id: 'fl-oz', kind: 'volume', forms: ['nesteunssi', 'nesteunssia', 'fl oz', 'fl. oz', 'fl.oz', 'fluid ounce', 'fluid ounces'] },
  { id: 'pint', kind: 'volume', forms: ['pintti', 'pinttiä', 'pint', 'pints', 'pt'] },
  { id: 'quart', kind: 'volume', forms: ['quart', 'quarts', 'qt'] },
  { id: 'gallon', kind: 'volume', forms: ['gallona', 'gallonaa', 'gallon', 'gallons'] },
  // Weight
  { id: 'g', kind: 'weight', forms: ['g', 'gr', 'gramma', 'grammaa', 'gramman', 'gram', 'grams', 'gramme', 'grammes'] },
  { id: 'kg', kind: 'weight', forms: ['kg', 'kilo', 'kiloa', 'kilon', 'kilos', 'kilogramma', 'kilogrammaa', 'kilogram', 'kilograms'] },
  { id: 'oz', kind: 'weight', forms: ['unssi', 'unssia', 'unssin', 'oz', 'ounce', 'ounces'] },
  { id: 'lb', kind: 'weight', forms: ['pauna', 'paunaa', 'paunan', 'lb', 'lbs', 'pound', 'pounds'] },
  // Length
  { id: 'mm', kind: 'length', forms: ['mm', 'millimetri', 'millimetriä', 'millimetrin', 'millimetre', 'millimetres', 'millimeter', 'millimeters'] },
  { id: 'cm', kind: 'length', forms: ['cm', 'sentti', 'senttiä', 'sentin', 'senttimetri', 'senttimetriä', 'senttimetrin', 'centimetre', 'centimetres', 'centimeter', 'centimeters'] },
  { id: 'in', kind: 'length', forms: ['tuuma', 'tuumaa', 'tuuman', 'in', 'inch', 'inches'] },
  // Packages
  { id: 'prk', kind: 'package', forms: ['prk', 'purkki', 'purkkia', 'purkin'] },
  { id: 'pss', kind: 'package', forms: ['pss', 'ps', 'pussi', 'pussia', 'pussin'] },
  { id: 'pkt', kind: 'package', forms: ['pkt', 'paketti', 'pakettia', 'paketin', 'pakkaus', 'pakkausta', 'pakkauksen'] },
  { id: 'rs', kind: 'package', forms: ['rs', 'rasia', 'rasiaa', 'rasian'] },
  { id: 'tlk', kind: 'package', forms: ['tlk', 'tölkki', 'tölkkiä', 'tölkin', 'tölkillinen', 'tölkillistä'] },
  { id: 'plo', kind: 'package', forms: ['plo', 'pullo', 'pulloa', 'pullon'] },
  { id: 'rku', kind: 'package', forms: ['rku', 'ruukku', 'ruukkua', 'ruukun'] },
  { id: 'can', kind: 'package', forms: ['can', 'cans', 'tin', 'tins'] },
  { id: 'package', kind: 'package', forms: ['package', 'packages', 'packet', 'packets', 'pack', 'packs', 'pkg'] },
  { id: 'jar', kind: 'package', forms: ['jar', 'jars'] },
  { id: 'carton', kind: 'package', forms: ['carton', 'cartons'] },
  { id: 'container', kind: 'package', forms: ['container', 'containers'] },
  { id: 'tub', kind: 'package', forms: ['tub', 'tubs'] },
  { id: 'bottle', kind: 'package', forms: ['bottle', 'bottles'] },
  { id: 'bag', kind: 'package', forms: ['bag', 'bags'] },
  { id: 'box', kind: 'package', forms: ['box', 'boxes'] },
  { id: 'block', kind: 'package', forms: ['block', 'blocks'] },
  { id: 'stick', kind: 'package', forms: ['stick', 'sticks'] },
  // Counts
  { id: 'kpl', kind: 'count', forms: ['kpl', 'kappale', 'kappaletta'] },
  { id: 'nippu', kind: 'count', forms: ['nippu', 'nippua'] },
  { id: 'oksa', kind: 'count', forms: ['oksa', 'oksaa'] },
  { id: 'kynsi', kind: 'count', forms: ['kynsi', 'kynttä'] },
  { id: 'viipale', kind: 'count', forms: ['viipale', 'viipaletta', 'siivu', 'siivua'] },
  { id: 'pala', kind: 'count', forms: ['pala', 'palaa'] },
  { id: 'levy', kind: 'count', forms: ['levy', 'levyä'] },
  { id: 'clove', kind: 'count', forms: ['clove', 'cloves'] },
  { id: 'slice', kind: 'count', forms: ['slice', 'slices'] },
  { id: 'bunch', kind: 'count', forms: ['bunch', 'bunches'] },
  { id: 'sprig', kind: 'count', forms: ['sprig', 'sprigs'] },
  { id: 'head', kind: 'count', forms: ['pää', 'päätä', 'head', 'heads'] },
  { id: 'stalk', kind: 'count', forms: ['stalk', 'stalks'] },
  { id: 'rib', kind: 'count', forms: ['rib', 'ribs'] },
  { id: 'ear', kind: 'count', forms: ['ear', 'ears'] },
  { id: 'piece', kind: 'count', forms: ['piece', 'pieces'] },
  { id: 'sheet', kind: 'count', forms: ['sheet', 'sheets'] },
  // Pinches
  { id: 'ripaus', kind: 'pinch', forms: ['ripaus', 'ripausta'] },
  { id: 'hyppysellinen', kind: 'pinch', forms: ['hyppysellinen', 'hyppysellistä'] },
  { id: 'tilkka', kind: 'pinch', forms: ['tilkka', 'tilkkaa'] },
  { id: 'loraus', kind: 'pinch', forms: ['loraus', 'lorausta'] },
  { id: 'tippa', kind: 'pinch', forms: ['tippa', 'tippaa'] },
  { id: 'kourallinen', kind: 'pinch', forms: ['kourallinen', 'kourallista'] },
  { id: 'pinch', kind: 'pinch', forms: ['pinch', 'pinches'] },
  { id: 'dash', kind: 'pinch', forms: ['dash', 'dashes'] },
  { id: 'handful', kind: 'pinch', forms: ['handful', 'handfuls'] },
  { id: 'knob', kind: 'pinch', forms: ['knob', 'knobs'] },
  { id: 'drop', kind: 'pinch', forms: ['drop', 'drops'] },
  { id: 'splash', kind: 'pinch', forms: ['splash', 'splashes'] },
] as const satisfies ReadonlyArray<{
  id: string
  kind: UnitKind
  forms: ReadonlyArray<string>
}>

export type UnitId = (typeof UNITS)[number]['id']

export type Unit = { readonly id: UnitId; readonly kind: UnitKind }

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
// for anything but exactly one. Abbreviations ("dl", "tbsp") and genitives
// ("1,5 litran vuoka") don't change.
// prettier-ignore
export const UNIT_WORDS: Record<Language, ReadonlyArray<readonly [singular: string, plural: string]>> = {
  en: [
    ['millilitre', 'millilitres'], ['milliliter', 'milliliters'], ['centilitre', 'centilitres'], ['centiliter', 'centiliters'],
    ['decilitre', 'decilitres'], ['deciliter', 'deciliters'], ['litre', 'litres'], ['liter', 'liters'],
    ['teaspoon', 'teaspoons'], ['tablespoon', 'tablespoons'], ['cup', 'cups'], ['fluid ounce', 'fluid ounces'],
    ['pint', 'pints'], ['quart', 'quarts'], ['gallon', 'gallons'],
    ['gram', 'grams'], ['gramme', 'grammes'], ['kilo', 'kilos'], ['kilogram', 'kilograms'], ['ounce', 'ounces'], ['pound', 'pounds'],
    ['millimetre', 'millimetres'], ['millimeter', 'millimeters'], ['centimetre', 'centimetres'], ['centimeter', 'centimeters'], ['inch', 'inches'],
    ['can', 'cans'], ['tin', 'tins'], ['package', 'packages'], ['packet', 'packets'], ['pack', 'packs'], ['jar', 'jars'],
    ['carton', 'cartons'], ['container', 'containers'], ['tub', 'tubs'], ['bottle', 'bottles'], ['bag', 'bags'], ['box', 'boxes'],
    ['block', 'blocks'], ['stick', 'sticks'], ['clove', 'cloves'], ['slice', 'slices'], ['bunch', 'bunches'], ['sprig', 'sprigs'],
    ['head', 'heads'], ['stalk', 'stalks'], ['rib', 'ribs'], ['ear', 'ears'], ['piece', 'pieces'], ['sheet', 'sheets'],
    ['pinch', 'pinches'], ['dash', 'dashes'], ['handful', 'handfuls'], ['knob', 'knobs'], ['drop', 'drops'], ['splash', 'splashes'],
  ],
  fi: [
    ['millilitra', 'millilitraa'], ['senttilitra', 'senttilitraa'], ['desilitra', 'desilitraa'], ['desi', 'desiä'], ['litra', 'litraa'],
    ['teelusikallinen', 'teelusikallista'], ['teelusikka', 'teelusikkaa'], ['ruokalusikallinen', 'ruokalusikallista'], ['ruokalusikka', 'ruokalusikkaa'],
    ['maustemitta', 'maustemittaa'], ['maustemitallinen', 'maustemitallista'], ['kuppi', 'kuppia'], ['kupillinen', 'kupillista'],
    ['nesteunssi', 'nesteunssia'], ['pintti', 'pinttiä'], ['gallona', 'gallonaa'],
    ['gramma', 'grammaa'], ['kilo', 'kiloa'], ['kilogramma', 'kilogrammaa'], ['unssi', 'unssia'], ['pauna', 'paunaa'],
    ['millimetri', 'millimetriä'], ['senttimetri', 'senttimetriä'], ['sentti', 'senttiä'], ['tuuma', 'tuumaa'],
    ['purkki', 'purkkia'], ['pussi', 'pussia'], ['paketti', 'pakettia'], ['pakkaus', 'pakkausta'], ['rasia', 'rasiaa'],
    ['tölkki', 'tölkkiä'], ['tölkillinen', 'tölkillistä'], ['pullo', 'pulloa'], ['ruukku', 'ruukkua'],
    ['kappale', 'kappaletta'], ['nippu', 'nippua'], ['oksa', 'oksaa'], ['kynsi', 'kynttä'], ['viipale', 'viipaletta'],
    ['siivu', 'siivua'], ['pala', 'palaa'], ['levy', 'levyä'], ['pää', 'päätä'],
    ['ripaus', 'ripausta'], ['hyppysellinen', 'hyppysellistä'], ['tilkka', 'tilkkaa'], ['loraus', 'lorausta'],
    ['tippa', 'tippaa'], ['kourallinen', 'kourallista'],
  ],
}

export function isMeasure(unit: Unit | null): boolean {
  return (
    unit !== null &&
    (unit.kind === 'volume' || unit.kind === 'weight' || unit.kind === 'length')
  )
}

const byId = new Map<UnitId, Unit>()
const byForm = new Map<string, Unit>()
for (const { id, kind, forms } of UNITS) {
  byId.set(id, { id, kind })
  for (const form of forms) byForm.set(form, { id, kind })
}

export function unitById(id: UnitId): Unit {
  const unit = byId.get(id)
  if (!unit) throw new Error(`Unknown unit ${id}`)
  return unit
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Longest forms first, so "tbsp" wins over "tbs" and "fl oz" over "fl".
const wordPattern = [...byForm.keys()]
  .sort((a, b) => b.length - a.length)
  .map((form) => escape(form).replace(/ /g, '\\s+'))
  .join('|')

// A unit word ends where the word ends.
const UNIT_WORD = new RegExp(String.raw`(?:${wordPattern})(?![\p{L}\d])`, 'iuy')
const LETTER_UNIT = new RegExp(
  String.raw`[${Object.keys(LETTER_UNITS).join('')}](?![\p{L}\d])`,
  'uy',
)
const INCH_MARK_AT = new RegExp(INCH_MARK, 'y')
const HYPHEN_WORD = new RegExp(String.raw`${HYPHEN}\p{L}`, 'uy')

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
  if (matchAt(INCH_MARK_AT, text, pos)) {
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

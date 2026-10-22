export type UnitKind =
  'volume' | 'weight' | 'length' | 'package' | 'count' | 'pinch'

// Every spelling the parser accepts, Finnish and English together, since a
// recipe may mix units. Finnish forms cover the nominative (1 purkki), the
// partitive used after other numbers (2 purkkia) and the genitive (1,5 litran
// vuoka). "mm" is missing on purpose: what it means depends on where it is
// written, see readUnit.
// prettier-ignore
export const UNITS = [
  // Volume
  { id: 'ml', kind: 'volume', forms: ['ml', 'millilitra', 'millilitraa', 'millilitran', 'millilitre', 'millilitres', 'milliliter', 'milliliters'] },
  { id: 'cl', kind: 'volume', forms: ['cl', 'senttilitra', 'senttilitraa', 'senttilitran', 'centilitre', 'centilitres', 'centiliter', 'centiliters'] },
  { id: 'dl', kind: 'volume', forms: ['dl', 'desilitra', 'desilitraa', 'desilitran', 'desi', 'desiä', 'decilitre', 'decilitres', 'deciliter', 'deciliters'] },
  { id: 'l', kind: 'volume', forms: ['l', 'ltr', 'litra', 'litraa', 'litran', 'litre', 'litres', 'liter', 'liters'] },
  { id: 'tsp', kind: 'volume', forms: ['tl', 'teelusikallinen', 'teelusikallista', 'teelusikallisen', 'tsp', 'tsps', 'teaspoon', 'teaspoons'] },
  { id: 'tbsp', kind: 'volume', forms: ['rkl', 'rk', 'ruokalusikallinen', 'ruokalusikallista', 'ruokalusikallisen', 'tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons'] },
  { id: 'maustemitta', kind: 'volume', forms: ['maustemitta', 'maustemittaa', 'maustemitallinen', 'maustemitallista'] },
  { id: 'cup', kind: 'volume', forms: ['cup', 'cups'] },
  { id: 'fl-oz', kind: 'volume', forms: ['fl oz', 'fl. oz', 'fl.oz', 'fluid ounce', 'fluid ounces'] },
  { id: 'pint', kind: 'volume', forms: ['pint', 'pints', 'pt'] },
  { id: 'quart', kind: 'volume', forms: ['quart', 'quarts', 'qt'] },
  { id: 'gallon', kind: 'volume', forms: ['gallon', 'gallons'] },
  // Weight
  { id: 'g', kind: 'weight', forms: ['g', 'gr', 'gramma', 'grammaa', 'gramman', 'gram', 'grams', 'gramme', 'grammes'] },
  { id: 'kg', kind: 'weight', forms: ['kg', 'kilo', 'kiloa', 'kilon', 'kilos', 'kilogramma', 'kilogrammaa', 'kilogram', 'kilograms'] },
  { id: 'oz', kind: 'weight', forms: ['oz', 'ounce', 'ounces'] },
  { id: 'lb', kind: 'weight', forms: ['lb', 'lbs', 'pound', 'pounds'] },
  // Length
  { id: 'mm', kind: 'length', forms: ['millimetri', 'millimetriä', 'millimetrin', 'millimetre', 'millimetres', 'millimeter', 'millimeters'] },
  { id: 'cm', kind: 'length', forms: ['cm', 'sentti', 'senttiä', 'sentin', 'senttimetri', 'senttimetriä', 'senttimetrin', 'centimetre', 'centimetres', 'centimeter', 'centimeters'] },
  { id: 'in', kind: 'length', forms: ['in', 'inch', 'inches'] },
  // Packages
  { id: 'prk', kind: 'package', forms: ['prk', 'purkki', 'purkkia', 'purkin'] },
  { id: 'pss', kind: 'package', forms: ['pss', 'ps', 'pussi', 'pussia', 'pussin'] },
  { id: 'pkt', kind: 'package', forms: ['pkt', 'paketti', 'pakettia', 'paketin', 'pakkaus', 'pakkausta', 'pakkauksen'] },
  { id: 'rs', kind: 'package', forms: ['rs', 'rasia', 'rasiaa', 'rasian'] },
  { id: 'tlk', kind: 'package', forms: ['tlk', 'tölkki', 'tölkkiä', 'tölkin'] },
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
  { id: 'head', kind: 'count', forms: ['head', 'heads'] },
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

export type UnitContext =
  // A Finnish ingredient line, where "mm" is maustemitta (1 ml).
  | 'fi-ingredient'
  // Anywhere else, where "mm" is millimetres.
  | 'other'

export function isMeasure(unit: Unit | null): boolean {
  return (
    unit !== null &&
    (unit.kind === 'volume' || unit.kind === 'weight' || unit.kind === 'length')
  )
}

const byForm = new Map<string, Unit>()
for (const { id, kind, forms } of UNITS) {
  for (const form of forms) byForm.set(form, { id, kind })
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Longest forms first, so "tbsp" wins over "tbs" and "fl oz" over "fl".
const wordPattern = [...byForm.keys(), 'mm']
  .sort((a, b) => b.length - a.length)
  .map((form) => escape(form).replace(/ /g, '\\s*'))
  .join('|')

// A unit word ends where the word ends.
const UNIT_WORD = new RegExp(String.raw`(?:${wordPattern})(?![\p{L}\d])`, 'iuy')

// "2 in-season peaches" and "2 L-kokoista kananmunaa" aren't inches and
// litres, while "19cm-square" is centimetres.
const NOT_BEFORE_HYPHEN = new Set(['in', 'l'])

// Inch marks only count glued to the number: 1/3" wide.
const INCH_MARK = /["″”]/y

export type UnitMatch = { unit: Unit; start: number; end: number }

export function readUnit(
  text: string,
  pos: number,
  context: UnitContext,
): UnitMatch | null {
  INCH_MARK.lastIndex = pos
  if (INCH_MARK.test(text)) {
    return { unit: { id: 'in', kind: 'length' }, start: pos, end: pos + 1 }
  }
  UNIT_WORD.lastIndex = pos
  const m = UNIT_WORD.exec(text)
  if (!m) return null
  const next = text.slice(pos + m[0].length, pos + m[0].length + 2)
  if (NOT_BEFORE_HYPHEN.has(m[0].toLowerCase()) && /^-\p{L}/u.test(next)) {
    return null
  }
  const word = m[0]
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace('fl. oz', 'fl oz')
  const unit: Unit | undefined =
    word === 'mm'
      ? context === 'fi-ingredient'
        ? { id: 'maustemitta', kind: 'volume' }
        : { id: 'mm', kind: 'length' }
      : byForm.get(word === 'fl.oz' ? 'fl oz' : word)
  if (!unit) return null
  return { unit, start: pos, end: pos + m[0].length }
}

import { describe, expect, it } from 'vitest'
import { parseIngredient } from '@/lib/quantities/ingredient'
import { CONVERSION_LIMIT } from '@/lib/quantities/kitchen'
import { sizeOf } from '@/lib/quantities/measures'
import { presentIngredient, presentStep } from '@/lib/quantities/present'
import { scan } from '@/lib/quantities/scan'
import { scanStep } from '@/lib/quantities/steps'
import { ingredientLines, inCorpus, stepSentences } from '@/test/corpus'
import { assertLedger } from '@/test/ledger'
import { presentedLedger } from '@/test/ledgers'
import type { LineQuantity } from '@/lib/quantities/line'
import type { DisplaySystem } from '@/lib/quantities/measures'
import type { PresentOptions, Presented } from '@/lib/quantities/present'
import type { MeasuringSystem, Quantity } from '@/lib/quantities/scan'
import type { CorpusLine } from '@/test/corpus'

// Every line here is copied from the corpus and presented with its own
// site's language and measuring system. "metric ×1.5" is the metric display
// at one and a half times the servings.
const CASES: Record<
  string,
  Array<[line: string, how: string, expected: string]>
> = {
  'cups and pints become decilitres': [
    ['0.5 cup butter', 'metric', '1.2 dl butter'],
    [
      '1-1/2 cups strong brewed coffee',
      'metric',
      '3.5 dl strong brewed coffee',
    ],
    [
      '1 pint shucked oysters or 2 cans (8 ounces each) whole oysters, drained',
      'metric',
      '4.7 dl shucked oysters or 2 cans (225 g each) whole oysters, drained',
    ],
    ['0.33333334326744 cup buttermilk', 'metric', '0.8 dl buttermilk'],
  ],
  'text that already gives the display system stays as written': [
    ['125g/4½oz caster sugar ', 'us', '125g/4½oz caster sugar '],
    [
      '2 2/3 cups (320g) King Arthur Unbleached All-Purpose Flour',
      'metric',
      '2 2/3 cups (320g) King Arthur Unbleached All-Purpose Flour',
    ],
    [
      '1 cup plus 2 tablespoons (134g) King Arthur Unbleached All-Purpose Flour',
      'metric',
      '1 cup plus 2 tablespoons (134g) King Arthur Unbleached All-Purpose Flour',
    ],
    [
      '200 gram (7-ounce) skinless, boneless ocean trout or salmon fillet',
      'us',
      '200 gram (7-ounce) skinless, boneless ocean trout or salmon fillet',
    ],
    [
      'Preheat oven to 350 degrees F (175 degrees C).',
      'metric',
      'Preheat oven to 350 degrees F (175 degrees C).',
    ],
    [
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)',
      'us',
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)',
    ],
  ],
  'the same amount twice converts once': [
    ['330ml/11fl oz sparkling water', 'us', '1⅓ cups/11fl oz sparkling water'],
    ['200 g (3-4 dl)  puolukoita', 'us', '7 unssia (1¼–1⅔ kuppia)  puolukoita'],
  ],
  'decilitres become cups, with tablespoons when a fraction is off': [
    ['1 dl sokeria', 'us', '⅓ kuppia + 1½ rkl sokeria'],
    ['3 dl vehnäjauhoja', 'us', '1¼ kuppia vehnäjauhoja'],
    ['2 dl kuohukermaa', 'us', '¾ kuppia + 1½ rkl kuohukermaa'],
    ['250ml Sokeria', 'us', '1 kuppi Sokeria'],
    [
      '½ dl Arla® Meijerivoita sulatettuna',
      'us',
      '3½ rkl Arla® Meijerivoita sulatettuna',
    ],
    [
      'Lisää kaksi desilitraa kuohukermaa, teelusikallinen suolaa sekä puoli teelusikallista mustapippuria.',
      'us',
      'Lisää ¾ kuppia + 1½ rkl kuohukermaa, teelusikallinen suolaa sekä puoli teelusikallista mustapippuria.',
    ],
  ],
  'Australian tablespoons become teaspoons': [
    ['1 tablespoon lime juice', 'metric', '4 tsp lime juice'],
    ['1 - 2 tbsp olive oil', 'metric', '4–8 tsp olive oil'],
    ['1 tablespoon (20g) ghee', 'metric', '1 tablespoon (20g) ghee'],
    ['1 tablespoon (20g) ghee', 'us', '4 tsp (¾ oz) ghee'],
    ['1 cup (220g) caster sugar', 'us', '1 cup (8 oz) caster sugar'],
  ],
  'amounts no unit fits stay as written': [
    ['½ g sahramia', 'us', '½ g sahramia'],
  ],
  weights: [
    [
      '1 pound shrimp, peeled and deveined',
      'metric',
      '450 g shrimp, peeled and deveined',
    ],
    ['1.25 pounds ground smoked ham', 'metric', '570 g ground smoked ham'],
    ['400G Nakkeja', 'us', '14 unssia Nakkeja'],
    [
      '1 (14 ounce) can sweetened condensed milk',
      'metric',
      '1 (400 g) can sweetened condensed milk',
    ],
    ['2 pkt (à 170 g)  pekonia', 'us', '2 pkt (à 6 unssia)  pekonia'],
  ],
  'lengths and sizes': [
    [
      '1-1/2 pounds boneless pork, cut into 1-inch cubes',
      'metric',
      '680 g boneless pork, cut into 2.5 cm cubes',
    ],
    [
      '2 (9 inch) prepared graham cracker crusts',
      'metric',
      '2 (23 cm) prepared graham cracker crusts',
    ],
    [
      'Grease and line the base and sides of 3 x 20cm cake tins with baking parchment.',
      'us',
      'Grease and line the base and sides of 3 x 8 in cake tins with baking parchment.',
    ],
    [
      'Spoon chicken mixture evenly into an 11x7-inch or 9-inch square baking dish.',
      'metric',
      'Spoon chicken mixture evenly into a 28 × 18 cm or 23 cm square baking dish.',
    ],
    [
      'Shape dough into 1-in. balls; place 2 in. apart on ungreased baking sheets.',
      'metric',
      'Shape dough into 2.5 cm balls; place 5 cm apart on ungreased baking sheets.',
    ],
  ],
  temperatures: [
    ['Preheat the oven to 375°F.', 'metric', 'Preheat the oven to 190°C.'],
    ['Kuumenna uuni 175 °C:een.', 'us', 'Kuumenna uuni 350 °F:een.'],
    [
      '1/4 cup warm water (110° to 115°)',
      'metric',
      '0.6 dl warm water (43–46°C)',
    ],
    [
      'Bake at 350 degrees for 1 hour or until internal meat temperature reaches 160 degrees F (73 degrees C).',
      'metric',
      'Bake at 180°C for 1 hour or until internal meat temperature reaches 160 degrees F (73 degrees C).',
    ],
    [
      'Preheat the oven to 190C/170C Fan/Gas 5 and grease a 26cm/10in spring-from cake tin.',
      'us',
      'Preheat the oven to 375°F/350°F Fan/Gas 5 and grease a 26cm/10in spring-from cake tin.',
    ],
    ['Paista 225 asteessa 45 minuuttia.', 'us', 'Paista 425 °F 45 minuuttia.'],
  ],
  "scaling keeps the writer's style": [
    ['1½ dl Arla® Kevytmaitoa', 'metric ×2', '3 dl Arla® Kevytmaitoa'],
    ['0,75dl kaakaojauhetta', 'metric ×2', '1,5dl kaakaojauhetta'],
    [
      '3-1/4 to 3-3/4 cups all-purpose flour',
      'us ×2',
      '6-1/2 to 7-1/2 cups all-purpose flour',
    ],
    [
      '1/2 to 1 teaspoon ground nutmeg, to taste',
      'us ×1.5',
      '3/4 to 1 1/2 teaspoons ground nutmeg, to taste',
    ],
    ['puolikas kurkkua siivutettuna', 'metric ×1.5', '¾ kurkkua siivutettuna'],
    ['  yksi paketti', 'metric ×2', '  kaksi pakettia'],
    [
      'two 8-ounce packages (452g) cream cheese, at room temperature',
      'metric ×1.5',
      'three 225 g packages (678g) cream cheese, at room temperature',
    ],
    [
      '600g/1lb 5oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
      'metric ×2',
      '1200g/2lb 10oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
    ],
    [
      'n. 5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
      'metric ×1.5',
      'n. 7,5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
    ],
    ['0.33333334326744 cup buttermilk', 'us ×1.2', '⅓ cup + 1 tbsp buttermilk'],
    ['1 tbsp soy sauce', 'us ×1.5', '1½ tbsp soy sauce'],
  ],
  'unit words agree with the new number': [
    ['1 maustemitta sahramia', 'metric ×1.5', '1½ maustemittaa sahramia'],
    ['1 clove garlic, minced', 'us ×2', '2 cloves garlic, minced'],
    ['1 pinch ground ginger', 'us ×2', '2 pinches ground ginger'],
    ['2 pulloa (0,33 l)  olutta', 'metric ×0.5', '1 pullo (0,17 l)  olutta'],
    [
      '4 rkl tuoretta tai 2 tl kuivattua timjamia',
      'metric ×1.5',
      '6 rkl tuoretta tai 3 tl kuivattua timjamia',
    ],
  ],
  "sizes of one piece don't scale": [
    [
      '2 x 150g cartons light Greek yogurt',
      'metric ×2',
      '4 x 150g cartons light Greek yogurt',
    ],
    [
      '3 tlk tomaattimurskaa, à 400 g',
      'metric ×2',
      '6 tlk tomaattimurskaa, à 400 g',
    ],
    [
      '½ dl vatkattua Arla® Lempi Smetana laktoositon 150 g',
      'metric ×2',
      '1 dl vatkattua Arla® Lempi Smetana laktoositon 150 g',
    ],
    [
      '2 boneless skinless chicken breasts, cut into slices 1cm/½in thick',
      'metric ×2',
      '4 boneless skinless chicken breasts, cut into slices 1cm/½in thick',
    ],
  ],
}

const corpus = [...ingredientLines, ...stepSentences]
const isStep = (line: string) => stepSentences.some((s) => s.text === line)

function presentLine(line: CorpusLine, opts: PresentOptions): Presented {
  return isStep(line.text)
    ? presentStep(line.text, scanStep(line.text, line), opts)
    : presentIngredient(parseIngredient(line.text, line), opts)
}

function optionsOf(line: CorpusLine, how: string): PresentOptions {
  const [display, factor] = how.split(' ×')
  return {
    language: line.language,
    system: line.system,
    display: display as DisplaySystem,
    factor: factor ? Number(factor) : 1,
  }
}

describe('presenting', () => {
  it('only uses lines from the corpus', () => {
    const lines = Object.values(CASES).flatMap((cases) => cases.map(([l]) => l))
    expect(lines.filter((line) => !inCorpus(corpus, line))).toEqual([])
  })

  for (const [group, cases] of Object.entries(CASES)) {
    describe(group, () => {
      it.each(cases)('%j %s', (text, how, expected) => {
        const line = corpus.find((l) => l.text === text)
        if (!line) throw new Error(`Not in the corpus: ${text}`)
        expect(presentLine(line, optionsOf(line, how)).text).toBe(expected)
      })
    })
  }

  it('marks what was converted and what scaled', () => {
    const text = '1 (14 ounce) can sweetened condensed milk'
    const parsed = parseIngredient(text, { language: 'en', system: 'us' })
    const { segments } = presentIngredient(parsed, {
      language: 'en',
      system: 'us',
      display: 'metric',
      factor: 2,
    })
    expect(segments).toEqual([
      {
        kind: 'quantity',
        index: 0,
        text: '2',
        original: '1',
        converted: false,
        scaled: true,
      },
      { kind: 'text', text: ' (' },
      {
        kind: 'quantity',
        index: 1,
        text: '400 g',
        original: '14 ounce',
        converted: true,
        scaled: false,
      },
      { kind: 'text', text: ') ' },
      {
        kind: 'quantity',
        index: 0,
        text: 'cans',
        original: 'can',
        converted: false,
        scaled: true,
      },
      { kind: 'text', text: ' sweetened condensed milk' },
    ])
  })

  it('keeps its presentation of every corpus line', () => {
    const path = 'src/lib/quantities/__ledger__/presented.txt'
    const check = presentedLedger(path, ingredientLines, stepSentences)
    assertLedger(check, path, (message) => expect.fail(message))
  })
})

// --- Properties over the whole corpus ---

const DISPLAYS: ReadonlyArray<DisplaySystem> = ['metric', 'us']
const FACTORS = [1, 1.5]

function eachPresentation(
  check: (
    line: CorpusLine,
    list: ReadonlyArray<LineQuantity>,
    shown: Presented,
    opts: PresentOptions,
  ) => void,
) {
  for (const line of corpus) {
    const step = isStep(line.text)
    const list = step
      ? scanStep(line.text, line)
      : parseIngredient(line.text, line).quantities
    for (const display of DISPLAYS) {
      for (const factor of step ? [1] : FACTORS) {
        const opts = {
          language: line.language,
          system: line.system,
          display,
          factor,
        }
        check(line, list, presentLine(line, opts), opts)
      }
    }
  }
}

// A quantity's size in millilitres, grams, millimetres or degrees Celsius,
// for comparing an amount with its conversion.
function sizeIn(q: Quantity, system: MeasuringSystem): [string, number] | null {
  const top = (v: number | { max: number }) =>
    typeof v === 'number' ? v : v.max
  if (q.type === 'temperature') {
    const v = top(q.value)
    return ['°', q.scale === 'C' ? v : ((v - 32) * 5) / 9]
  }
  const unit = q.unit
  const size = unit ? sizeOf(unit, system) : null
  if (!unit || size === null) return null
  const value = q.type === 'dimensions' ? Math.max(...q.values) : top(q.value)
  return [unit.kind, value * size]
}

describe('every presentation', () => {
  it('is made of the original text and the quantities shown', () => {
    eachPresentation((line, _, shown) => {
      const original = shown.segments
        .map((s) => (s.kind === 'text' ? s.text : s.original))
        .join('')
      expect(original, line.text).toBe(line.text)
      expect(shown.segments.map((s) => s.text).join('')).toBe(shown.text)
    })
  })

  it('leaves the text alone when nothing converts or scales', () => {
    eachPresentation((line, _, shown) => {
      const changed = shown.segments.some(
        (s) => s.kind === 'quantity' && (s.converted || s.scaled),
      )
      if (!changed) expect(shown.text, line.text).toBe(line.text)
    })
  })

  // What a conversion writes, the parser reads back as about the same
  // amount in the display's units.
  it('reads back as the amount it converted', () => {
    eachPresentation((line, list, shown, opts) => {
      const shownSystem: MeasuringSystem =
        opts.display === 'us' ? 'us' : 'metric'
      for (const s of shown.segments) {
        if (s.kind !== 'quantity' || !s.converted) continue
        const q = list[s.index]
        const before = sizeIn(q, line.system)
        if (!before) continue
        const factor = q.scales ? (opts.factor ?? 1) : 1
        const read = scan(s.text, 0, {
          language: line.language,
          system: shownSystem,
        })
        const sizes = read.flatMap((r) => {
          const size = sizeIn(r, shownSystem)
          return size ? [size] : []
        })
        const where = `${line.text} → ${s.text}`
        expect(sizes.length, where).toBeGreaterThan(0)
        expect(
          sizes.every(([kind]) => kind === before[0]),
          where,
        ).toBe(true)
        const after = sizes.reduce((sum, [, v]) => sum + v, 0)
        const expected = before[1] * factor
        const slack = before[0] === '°' ? 8 : CONVERSION_LIMIT * expected
        expect(Math.abs(after - expected), where).toBeLessThanOrEqual(slack)
      }
    })
  })
})

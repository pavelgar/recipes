import { describe, expect, it } from 'vitest'
import { parseIngredient } from '@/lib/quantities/ingredient'
import { readUnit } from '@/lib/quantities/units'
import { inCorpus, ingredientLines } from '@/test/corpus'
import { describeIngredient } from '@/test/quantities'
import type { Language } from '@/lib/quantities/numbers'

// Every line here is copied from the corpus, entities decoded. The first
// test checks that, so nothing in this file is made up.
const CASES: Record<string, Array<[line: string, expected: string]>> = {
  'numbers and units': [
    ['1½ dl Arla® Kevytmaitoa', 'measured 1.5 dl'],
    ['3 1/2dl Puuroriisiä', 'measured 3.5 dl'],
    ['0,75dl kaakaojauhetta', 'measured 0.75 dl'],
    ['1.5dl Maitoa', 'measured 1.5 dl'],
    ['0.5 cup balsamic vinegar', 'measured 0.5 cup'],
    ['3Kpl Munaa', 'counted 3 kpl'],
    ['8kynttä valkosipulia', 'counted 8 kynsi'],
    ['1 rku korianteria', 'counted 1 rku'],
    ['1 tlk creme fraichea', 'counted 1 tlk'],
    ['1 fluid ounce vodka', 'measured 1 fl-oz'],
    [
      '5 centimetre piece fresh ginger, peeled, sliced thickly',
      'measured 5 cm',
    ],
    ['1 pinch ground ginger', 'counted 1 pinch'],
    [
      '2 handfuls amaretti biscuits, smashed into small pieces ',
      'counted 2 handful',
    ],
    ['1 clove garlic, minced', 'counted 1 clove'],
    ['3 cl espressoa', 'measured 3 cl'],
    ['1 maustemitta sahramia', 'measured 1 maustemitta'],
    ['1 plo (0', 'counted 1 plo'],
  ],
  'ranges and approximate amounts': [
    ['2 - 4 dl hyvälaatuista kumaa kahvia', 'measured 2-4 dl'],
    [
      '1/2 - 1 kpl kasvisliemikuutio TAI maun mukaan suolaa',
      'counted 0.5-1 kpl',
    ],
    ['1/2 to 1 teaspoon ground nutmeg, to taste', 'measured 0.5-1 tsp'],
    [
      '1/8 to 1/2 teaspoon extra-strong flavor, optional*',
      'measured 0.125-0.5 tsp',
    ],
    ['n 1tl voita', 'measured ~1 tsp'],
    [
      'n. 5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
      'measured ~5 dl',
    ],
    ['n.4-6cl kuohuviiniä/proseccoa', 'measured ~4-6 cl'],
  ],
  'number words': [
    ['puolikas kurkkua siivutettuna', 'counted 0.5'],
    ['  yksi paketti', 'counted 1 pkt'],
  ],
  'words after the number that are not units': [
    ['2 kahvikupillista vettä ', 'counted 2'],
    ['1 large egg', 'counted 1'],
    ['2 Little Gem lettuces quartered', 'counted 2'],
    ['2 pak choi, roots trimmed, leaves separated and washed', 'counted 2'],
    [
      '5 medium potatoes, peeled, halved lengthways, and cut into 5x4cm/2x1½in chunks',
      'counted 5',
    ],
  ],
  'percentages and notes': [
    ['4dl 77% sokerilientä', 'measured 4 dl'],
    ['250g.prk rahkajogurttia (Milbona 0,9%)', 'measured 250 g'],
    ['1 tbsp Chinese cooking wine ((Note 4 subs))', 'measured 1 tbsp'],
    ['Red chilli julienned ((Note 4))', 'no-amount'],
  ],
  'sizes: each': [
    ['2 pkt (à 170 g)  pekonia', 'counted 2 pkt | each 170 g'],
    [
      '½-1 palaa (à 170 g) Valio AURA® juustoa',
      'counted 0.5-1 pala | each 170 g',
    ],
    ['1 pkt (4 x 100 g) seitiä annospaloina', 'counted 1 pkt | each 100 g'],
    ['1 (14 ounce) can sweetened condensed milk', 'counted 1 can | each 14 oz'],
    [
      '1 (15.25 ounce) package yellow cake mix',
      'counted 1 package | each 15.25 oz',
    ],
    ['2 (9 inch) prepared graham cracker crusts', 'counted 2 | each 9 in'],
    ['2 x 150g cartons light Greek yogurt', 'counted 2 carton | each 150 g'],
    [
      '½ x 400g/14 oz tin chopped tomatoes ',
      'counted 0.5 can | each 400 g = 14 oz',
    ],
    [
      '2 x 350 - 400g / 12 - 13 oz  bream or snapper fish (, gutted, scaled and cleaned (Note 1))',
      'counted 2 | each 350-400 g = 12-13 oz',
    ],
  ],
  'sizes: total': [
    [
      '1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)',
      'counted 1 pss | total 350 g',
    ],
    ['4 välikyljystä (yht. n. 600 g)', 'counted 4 | total ~600 g'],
    // Plainly written sizes count as totals, even where the site meant
    // each bottle.
    ['2 pulloa (0,33 l)  olutta', 'counted 2 plo | total 0.33 l'],
    ['4 (800g) chicken breast fillets', 'counted 4 | total 800 g'],
    ['2 (about 400g) sweet potatoes halved', 'counted 2 | total ~400 g'],
    ['4 thick slices ciabatta bread (120g)', 'counted 4 | total 120 g'],
  ],
  'the same amount written twice': [
    ['125g/4½oz caster sugar ', 'measured 125 g = 4.5 oz'],
    [
      '600g/1lb 5oz raw jumbo prawns, peeled and deveined (defrosted if frozen)',
      'measured 600 g = 1.313 lb',
    ],
    ['330ml/11fl oz sparkling water', 'measured 330 ml = 11 fl-oz'],
    [
      '1.2 litres/2 pints chicken stock, heated with ¼ tsp saffron strands',
      'measured 1.2 l = 2 pint',
    ],
    [
      '2 2/3 cups (320g) King Arthur Unbleached All-Purpose Flour',
      'measured 2.667 cup = 320 g',
    ],
    [
      '1 1/3 to 1 1/2 cups (301g to 340g) water, lukewarm',
      'measured 1.333-1.5 cup = 301-340 g',
    ],
    [
      '300 gram (9½ ounces) lean minced (ground) beef',
      'measured 300 g = 9.5 oz',
    ],
    // Published with the wrong ounces; the parser reads what is written.
    ['800 gram (1½ ounces) canned diced tomatoes', 'measured 800 g = 1.5 oz'],
    ['4 tl (2 cl) Valio glögiä', 'measured 4 tsp = 2 cl'],
    [
      '400 g Arla® Lempi Maitorahka 0,2 % laktoositon (1 prk)',
      'measured 400 g | same 1 prk',
    ],
    ['250g Herkkusieniä (1 pkt)', 'measured 250 g | same 1 pkt'],
    [
      '250g / 2 sticks  unsalted butter (, softened)',
      'measured 250 g | same 2 stick',
    ],
    // The second amount belongs to the butter, not the coconut oil.
    [
      '1/4 cup (53g) coconut oil or 4 tablespoons (57g) butter, at room temperature',
      'measured 0.25 cup = 53 g',
    ],
  ],
  'amounts in parentheses': [
    ['Ison sitruunan mehu (90 ml)', 'measured 90 ml'],
    ['Sitruunan kuori raasteena (1 rkl)', 'measured 1 tbsp'],
    ['( 2 tl suolaa )', 'measured 2 tsp'],
    ['  (3-4 cl konjakkia)', 'measured 3-4 cl'],
  ],
  'no amount': [
    ['suolaa', 'no-amount'],
    ['muutama tuoreen salvianlehteä', 'no-amount'],
    ['Iso kananmuna', 'no-amount'],
    ['salt and pepper to taste', 'no-amount'],
    ['a few tarragon sprigs finely chopped (optional)', 'no-amount'],
    ['Pinch of salt', 'no-amount'],
    ['Salt & pepper', 'no-amount'],
  ],
  unrecognised: [
    ['Fetaa 1', 'unrecognised'],
    ['2 + 2rkl persiljaa ja basilikaa', 'unrecognised'],
    ['kakkupohja, valmis 8-10hlö (Rainbow)', 'unrecognised'],
    ['finely grated zest of 1 lemon', 'unrecognised'],
    [
      '1 cup plus 2 tablespoons (134g) King Arthur Unbleached All-Purpose Flour',
      'unrecognised',
    ],
    ['1/4 plus 1/8 teaspoon baking soda', 'unrecognised'],
    ['4 x 3cm / 1 x 2" piece of  ginger julienned', 'unrecognised'],
  ],
}

const languageOf = (line: string): Language =>
  ingredientLines.find((l) => l.text === line)?.language ?? 'en'

describe('parseIngredient', () => {
  it('only uses lines from the corpus', () => {
    const lines = Object.values(CASES).flatMap((cases) => cases.map(([l]) => l))
    expect(lines.filter((line) => !inCorpus(ingredientLines, line))).toEqual([])
  })

  for (const [group, cases] of Object.entries(CASES)) {
    describe(group, () => {
      it.each(cases)('%j', (line, expected) => {
        expect(
          describeIngredient(parseIngredient(line, languageOf(line))),
        ).toBe(expected)
      })
    })
  }

  it('says where each part is in the text', () => {
    const slices = (line: string) => {
      const { amount, extra } = parseIngredient(line, languageOf(line))
      const at = (span: readonly [number, number] | null | undefined) =>
        span ? line.slice(span[0], span[1]) : null
      return {
        amount: at(amount?.at),
        value: at(amount?.valueAt),
        unit: at(amount?.unitAt),
        alt: at(amount?.alt?.at),
        extra: at(extra?.at),
      }
    }
    expect(slices('2 pkt (à 170 g)  pekonia')).toEqual({
      amount: '2 pkt',
      value: '2',
      unit: 'pkt',
      alt: null,
      extra: '170 g',
    })
    expect(slices('1 (14 ounce) can sweetened condensed milk')).toEqual({
      amount: '1 (14 ounce) can',
      value: '1',
      unit: 'can',
      alt: null,
      extra: '14 ounce',
    })
    expect(slices('125g/4½oz caster sugar ')).toEqual({
      amount: '125g',
      value: '125',
      unit: 'g',
      alt: '4½oz',
      extra: null,
    })
    expect(
      slices(
        'n. 5dl Virtasalmen Viljatuotteen Vaaleaa gluteenitonta jauhoseosta',
      ),
    ).toEqual({
      amount: '5dl',
      value: '5',
      unit: 'dl',
      alt: null,
      extra: null,
    })
  })

  it('handles every corpus line', () => {
    for (const line of ingredientLines) {
      const { amount, extra } = parseIngredient(line.text, line.language)
      for (const a of [amount, amount?.alt, extra, extra?.alt]) {
        if (!a) continue
        expect(a.at[0]).toBeGreaterThanOrEqual(0)
        expect(a.at[1]).toBeLessThanOrEqual(line.text.length)
        if (a.unitAt && a.unit?.id !== 'lb') {
          const context = line.language === 'fi' ? 'fi-ingredient' : 'other'
          expect(readUnit(line.text, a.unitAt[0], context)?.unit).toEqual(
            a.unit,
          )
        }
      }
    }
  })

  it('keeps its results across the corpus', () => {
    // A rule change that moves these numbers should be deliberate.
    const counts = { fi: {}, en: {} } as Record<
      Language,
      Record<string, number>
    >
    for (const line of ingredientLines) {
      const { result } = parseIngredient(line.text, line.language)
      counts[line.language][result] = (counts[line.language][result] ?? 0) + 1
    }
    expect(counts).toEqual({
      fi: { measured: 1189, counted: 474, 'no-amount': 211, unrecognised: 5 },
      en: { measured: 1215, counted: 424, 'no-amount': 152, unrecognised: 10 },
    })
  })
})

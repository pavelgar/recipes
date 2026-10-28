import { describe, expect, it } from 'vitest'
import { scanStep } from '@/core/quantities/steps'
import { stepSentences } from '@/testing/corpus'
import { assertLedger } from '@/testing/ledger'
import { stepLedger } from '@/testing/ledgers'
import { describeStep } from '@/testing/quantities'

// Every sentence here is copied from the corpus, entities decoded, and is
// scanned with its own site's language and measuring system. Readings are
// written as described in src/testing/quantities.ts: "?°C" marks a scale
// taken from the measuring system because the step gives none, "both" a
// temperature already given in °C and °F, and "~" an approximate amount.
const CASES: Record<
  string,
  Array<[sentence: string, expected: Array<string>]>
> = {
  'Finnish temperatures': [
    ['Kuumenna uuni 175 °C:een.', ['175 °C  [175 °C]']],
    ['Kuumenna uuni 200 ℃:seen.', ['200 °C  [200 ℃]']],
    [
      'Lado lihapullat leivinpaperin päälle uunipellille ja paista kypsiksi uunissa 200°C:ssa n. 20 minuuttia.',
      ['200 °C  [200°C]'],
    ],
    ['Paista 225 asteessa 45 minuuttia.', ['225 °C  [225 asteessa]']],
    [
      'Paista kakkua 175 - 200 asteessa n 25.40 min uunistasi riippuen.',
      ['175-200 °C  [175 - 200 asteessa]'],
    ],
    [
      'Paista sipuleita 180-asteisessa uunissa 10 minuuttia.',
      ['180 °C  [180-asteisessa]'],
    ],
    [
      'Paista 175 asteisessa uunissa 30 minuuttia.',
      ['175 °C  [175 asteisessa]'],
    ],
    [
      'Grillaa broileria, kunnes sisälämpö on 75 astetta paksuimmasta kohdasta.',
      ['75 °C  [75 astetta]'],
    ],
    ['Laita taikina uuniin ja paista 200 C n. 30 min', ['200 °C  [200 C]']],
    ['220° 30-45min', ['220 ?°C  [220°]']],
    [
      'Painele tiiviisti haarukalla reunat umpeen ja uppopaista 180° öljyssä kattilassa molemmin puolin.',
      ['180 ?°C  [180°]'],
    ],
  ],
  'English temperatures': [
    ['Preheat the oven to 375°F.', ['375 °F  [375°F]']],
    [
      'Add the trout and poach gently at 50C for 10–15 minutes, take the fish to 48 degrees and allow to rest for at least 5 minutes before serving.',
      ['50 °C  [50C]', '48 ?°C  [48 degrees]'],
    ],
    [
      'Bake at 350 degrees for 1 hour or until internal meat temperature reaches 160 degrees F (73 degrees C).',
      [
        '350 ?°F  [350 degrees]',
        '160 °F both  [160 degrees F]',
        '73 °C both  [73 degrees C]',
      ],
    ],
    [
      'Preheat oven to 350 degrees F (175 degrees C).',
      ['350 °F both  [350 degrees F]', '175 °C both  [175 degrees C]'],
    ],
    [
      'Preheat the oven to 180C/350F/Gas 4.',
      ['180 °C both  [180C]', '350 °F both  [350F]'],
    ],
    [
      'Preheat oven to 200°C / 390°F (180°C fan-forced).',
      ['200 °C both  [200°C]', '390 °F both  [390°F]', '180 °C both  [180°C]'],
    ],
    [
      'Preheat oven to 220C / 430F (standard oven) or 200C / 390F (fan forced / convection).',
      [
        '220 °C both  [220C]',
        '430 °F both  [430F]',
        '200 °C both  [200C]',
        '390 °F both  [390F]',
      ],
    ],
    // Fan temperatures in °C alone still convert; gas marks stay as written.
    [
      'Preheat the oven to 190C/170C Fan/Gas 5 and grease a 26cm/10in spring-from cake tin.',
      ['190 °C  [190C]', '170 °C  [170C]', '26 cm = 10 in  [26cm] [10in]'],
    ],
    [
      'Preheat the oven to moderate, 180°C (160°C fan-forced).',
      ['180 °C  [180°C]', '160 °C  [160°C]'],
    ],
    [
      'In cooler months (when your indoor temperature is about 65°F), use 100°F to 110°F water.',
      ['~65 °F  [65°F]', '100-110 °F  [100°F to 110°F]'],
    ],
  ],
  angles: [
    ['Bake 65 minutes, rotating tray 180° at 45 minutes.', []],
    [
      'Roll it into a 12" x 16" rectangle, fold in three (like a business letter), flip the dough over and give it a 90°; turn, and repeat the rolling and folding process.',
      ['12x16 in  [12" x 16"]'],
    ],
    [
      'Fold the dough into thirds like a business letter, then turn it 90°.',
      [],
    ],
    [
      'Turn the folded dough 90° and roll into a 6" x 14" rectangle.',
      ['6x14 in  [6" x 14"]'],
    ],
  ],
  // A bare "in" is inches only when what follows fits a size.
  inches: [
    [
      'Shape dough into 1-in. balls; place 2 in. apart on ungreased baking sheets.',
      ['1 in  [1-in]', '2 in  [2 in]'],
    ],
    [
      'Broil 3-4 in. from heat until cheese is melted, 1-2 minutes.',
      ['3-4 in  [3-4 in]'],
    ],
    [
      'Press onto bottom and 1-1/2 in. up sides of prepared pan.',
      ['1.5 in  [1-1/2 in]'],
    ],
    [
      'Make two equally deep slashes in the thighs and two in the drumsticks as well.',
      [],
    ],
    ['Wrap two in cling film and freeze for another time.', []],
    ['Repeat with remaining butter and batter to make 16 in total.', []],
  ],
  sizes: [
    [
      'Kauli sulaneet taikinalevyt noin 12 × 24 cm kokoisiksi levyiksi.',
      ['~12x24 cm  [12 × 24 cm]'],
    ],
    [
      'Levitä taikina leivinpaperilla vuoratulle uunipellille (35 cm x 40 cm).',
      ['35x40 cm  [35 cm x 40 cm]'],
    ],
    [
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)',
      ['23x33 cm = 13x9 in  [23 x 33cm] [13 x 9"]'],
    ],
    [
      'Grease an 8 1/2" by 4 1/2" loaf pan; or a 9" x 4" x 4" gluten-free loaf pan, which will give you a taller, more shapely loaf.',
      ['8.5x4.5 in  [8 1/2" by 4 1/2"]', '9x4x4 in  [9" x 4" x 4"]'],
    ],
    [
      'Spoon chicken mixture evenly into an 11x7-inch or 9-inch square baking dish.',
      ['11x7 in  [11x7-inch]', '9 in  [9-inch]'],
    ],
    // Three tins, each 20 cm.
    [
      'Grease and line the base and sides of 3 x 20cm cake tins with baking parchment.',
      ['20 cm  [20cm]'],
    ],
    [
      'Grease a deep 19cm-square cake pan, line base and two opposite sides with baking paper.',
      ['19 cm  [19cm]'],
    ],
    [
      'Place butter and onion on a double thickness of heavy-duty foil (about 34 in. x 18 in.).',
      ['~34x18 in  [34 in. x 18 in]'],
    ],
    // The first size takes the unit written after the second.
    [
      'Grease bottom and sides of square pan, 8x8x2 or 9x9x2 inches, with shortening.',
      ['8x8x2 in  [8x8x2]', '9x9x2 in  [9x9x2 inches]'],
    ],
    [
      'Leikkaa pintaan molemmin puolin 4–5 noin 1⁄2 cm:n syvyistä viiltoa.',
      ['~0.5 cm  [1⁄2 cm]'],
    ],
    [
      'Flatten lightly with spatula to about 1cm / 4/5" thick.',
      ['~1 cm = 0.8 in  [1cm] [4/5"]'],
    ],
    // "mm" in steps is millimetres.
    [
      'Tear off handfuls of dough about the size of a tangerine, or 100g/3½oz. Take one and flatten it with your hands to create a vaguely circular shape about 2mm/1/16in thick.',
      ['100 g = 3.5 oz  [100g] [3½oz]', '~2 mm = 0.063 in  [2mm] [1/16in]'],
    ],
  ],
  amounts: [
    ['Cooked squash should equal 2 cups.', ['2 cup  [2 cups]']],
    [
      'Kaada taikina voideltuun, suorakaiteen muotoiseen 1,5 litran vetoiseen leipävuokaan.',
      ['1.5 l  [1,5 litran]'],
    ],
    [
      'Put half the potato cubes in a heavy-based, buttered, 2-litre casserole dish.',
      ['2 l  [2-litre]'],
    ],
    // In any case a measure is written in: "6 desissä" is "in 6 dl".
    [
      'Täyte: keitä puuroriisi 3 1/2 desiä 6 desissä vettä kypsäksi.',
      ['3.5 dl  [3 1/2 desiä]', '6 dl  [6 desissä]'],
    ],
    [
      'Minun salaattisoosini on 3 rkl rypäleöljyä,1 rkl sitruunamehua,1 tl Dijon-sinappia ja suolaa.',
      ['3 tbsp  [3 rkl]', '1 tbsp  [1 rkl]', '1 tsp  [1 tl]'],
    ],
    [
      'Heat 1 tsp Birria oil over low heat, wipe pan with tortilla, remove, repeat x2 with 1/2 tsp oil each.',
      ['1 tsp  [1 tsp]', '0.5 tsp  [1/2 tsp]'],
    ],
    [
      'Add the bok choi and 75ml/3fl oz of water and stir fry until the bok choi is tender and the liquid evaporated.',
      ['75 ml = 3 fl-oz  [75ml] [3fl oz]'],
    ],
    [
      'Process 200g (6½ ounces) of the biscuits until fine, chop remaining biscuits coarsely.',
      ['200 g = 6.5 oz  [200g] [6½ ounces]'],
    ],
    [
      'Line 6-hole (¾-cup/180ml) texas muffin pan with paper cases.',
      ['0.75 cup = 180 ml  [¾-cup] [180ml]'],
    ],
    [
      'Garnish with crispy sage, 1 or 2 teaspoons of brown butter and parmesan cheese.',
      ['1-2 tsp  [1 or 2 teaspoons]'],
    ],
  ],
  'amounts in words': [
    [
      'Lisää kaksi desilitraa kuohukermaa, teelusikallinen suolaa sekä puoli teelusikallista mustapippuria.',
      [
        '2 dl  [kaksi desilitraa]',
        '1 tsp  [teelusikallinen]',
        '0.5 tsp  [puoli teelusikallista]',
      ],
    ],
    [
      'Nosta pataan kaikki leikkeet ja ripottele pinnalle puolitoista teelusikallista suolaa, kaksi teelusikallista kuivattua rosmariinia ja puoli teelusikallista rouhittua mustapippuria.',
      [
        '1.5 tsp  [puolitoista teelusikallista]',
        '2 tsp  [kaksi teelusikallista]',
        '0.5 tsp  [puoli teelusikallista]',
      ],
    ],
    [
      'Sekoita kolme ja puoli desilitraa vehnäjauhoja ja puolitoista teelusikallista leivinjauhetta yhteen.',
      [
        '3.5 dl  [kolme ja puoli desilitraa]',
        '1.5 tsp  [puolitoista teelusikallista]',
      ],
    ],
    [
      'Add one tablespoon of the vegetable oil, and when it is hot and slightly smoking, add the chicken and stir fry for 2-3 minutes, or until nearly cooked through.',
      ['1 tbsp  [one tablespoon]'],
    ],
    [
      'Use a tablespoon or so of the sauce to coat the turkey, then place this on top.',
      ['1 tbsp  [a tablespoon]'],
    ],
    ['A tablespoon cookie scoop works well here.', []],
    [
      'Weigh your flour; or measure it by gently spooning it into a cup, then sweeping off any excess.',
      [],
    ],
  ],
  'left alone': [
    [
      'Combine cream cheese with 1 pinch each of oregano and garlic salt in a medium bowl; beat with an electric mixer until smooth.',
      [],
    ],
    ['Valmista samalla tavalla toiset 12 kappaletta donitseja.', []],
  ],
}

const find = (sentence: string) =>
  stepSentences.find((s) => s.text === sentence)

const scan = (sentence: string) => {
  const line = find(sentence)
  return scanStep(sentence, {
    language: line?.language ?? 'en',
    system: line?.system ?? 'us',
  })
}

describe('scanStep', () => {
  it('only uses sentences from the corpus', () => {
    const sentences = Object.values(CASES).flatMap((cases) =>
      cases.map(([s]) => s),
    )
    expect(sentences.filter((s) => !find(s))).toEqual([])
  })

  for (const [group, cases] of Object.entries(CASES)) {
    describe(group, () => {
      it.each(cases)('%j', (sentence, expected) => {
        expect(describeStep(sentence, scan(sentence))).toEqual(expected)
      })
    })
  }

  it('links a size given again in another unit to the first', () => {
    const sentence =
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)'
    expect(scan(sentence).map((q) => [q.role, q.of, q.scales])).toEqual([
      ['other', null, false],
      ['same', 0, false],
    ])
  })

  it('keeps its reading of every corpus sentence', () => {
    const path = 'src/core/quantities/__ledger__/steps.txt'
    const check = stepLedger(path, stepSentences, 'corpus')
    assertLedger(check, path, (message) => expect.fail(message))
  })
})

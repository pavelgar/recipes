import { describe, expect, it } from 'vitest'
import { scanStep } from '@/lib/quantities/steps'
import { stepSentences } from '@/test/corpus'
import { describeStepQuantity } from '@/test/quantities'

// Every sentence here is copied from the corpus, entities decoded, and is
// scanned with its own site's language and measuring system. "?°C" marks a
// scale taken from the measuring system because the step gives none.
const CASES: Record<
  string,
  Array<[sentence: string, expected: Array<string>]>
> = {
  'Finnish temperatures': [
    ['Kuumenna uuni 175 °C:een.', ['175 °C']],
    ['Kuumenna uuni 200 ℃:seen.', ['200 °C']],
    [
      'Lado lihapullat leivinpaperin päälle uunipellille ja paista kypsiksi uunissa 200°C:ssa n. 20 minuuttia.',
      ['200 °C'],
    ],
    ['Paista 225 asteessa 45 minuuttia.', ['225 °C']],
    [
      'Paista kakkua 175 - 200 asteessa n 25.40 min uunistasi riippuen.',
      ['175-200 °C'],
    ],
    ['Paista sipuleita 180-asteisessa uunissa 10 minuuttia.', ['180 °C']],
    ['Paista 175 asteisessa uunissa 30 minuuttia.', ['175 °C']],
    [
      'Grillaa broileria, kunnes sisälämpö on 75 astetta paksuimmasta kohdasta.',
      ['75 °C'],
    ],
    ['Laita taikina uuniin ja paista 200 C n. 30 min', ['200 °C']],
    ['220° 30-45min', ['220 ?°C']],
    [
      'Painele tiiviisti haarukalla reunat umpeen ja uppopaista 180° öljyssä kattilassa molemmin puolin.',
      ['180 ?°C'],
    ],
  ],
  'English temperatures': [
    ['Preheat the oven to 375°F.', ['375 °F']],
    [
      'Add the trout and poach gently at 50C for 10–15 minutes, take the fish to 48 degrees and allow to rest for at least 5 minutes before serving.',
      ['50 °C', '48 ?°C'],
    ],
    [
      'Bake at 350 degrees for 1 hour or until internal meat temperature reaches 160 degrees F (73 degrees C).',
      ['350 ?°F', '160 °F both', '73 °C both'],
    ],
    [
      'Preheat oven to 350 degrees F (175 degrees C).',
      ['350 °F both', '175 °C both'],
    ],
    ['Preheat the oven to 180C/350F/Gas 4.', ['180 °C both', '350 °F both']],
    [
      'Preheat oven to 200°C / 390°F (180°C fan-forced).',
      ['200 °C both', '390 °F both', '180 °C both'],
    ],
    [
      'Preheat oven to 220C / 430F (standard oven) or 200C / 390F (fan forced / convection).',
      ['220 °C both', '430 °F both', '200 °C both', '390 °F both'],
    ],
    // Fan temperatures in °C alone still convert; gas marks stay as written.
    [
      'Preheat the oven to 190C/170C Fan/Gas 5 and grease a 26cm/10in spring-from cake tin.',
      ['190 °C', '170 °C', '26 cm = 10 in'],
    ],
    [
      'Preheat the oven to moderate, 180°C (160°C fan-forced).',
      ['180 °C', '160 °C'],
    ],
  ],
  angles: [
    ['Bake 65 minutes, rotating tray 180° at 45 minutes.', []],
    [
      'Roll it into a 12" x 16" rectangle, fold in three (like a business letter), flip the dough over and give it a 90°; turn, and repeat the rolling and folding process.',
      ['12x16 in'],
    ],
  ],
  sizes: [
    [
      'Kauli sulaneet taikinalevyt noin 12 × 24 cm kokoisiksi levyiksi.',
      ['12x24 cm'],
    ],
    [
      'Levitä taikina leivinpaperilla vuoratulle uunipellille (35 cm x 40 cm).',
      ['35x40 cm'],
    ],
    [
      'Line the base of a 23 x 33cm / 13 x 9" pan with paper (Note 5)',
      ['23x33 cm = 13x9 in'],
    ],
    [
      'Grease an 8 1/2" by 4 1/2" loaf pan; or a 9" x 4" x 4" gluten-free loaf pan, which will give you a taller, more shapely loaf.',
      ['8.5x4.5 in', '9x4x4 in'],
    ],
    [
      'Spoon chicken mixture evenly into an 11x7-inch or 9-inch square baking dish.',
      ['11x7 in', '9 in'],
    ],
    // Three tins, each 20 cm.
    [
      'Grease and line the base and sides of 3 x 20cm cake tins with baking parchment.',
      ['20 cm'],
    ],
    [
      'Grease a deep 19cm-square cake pan, line base and two opposite sides with baking paper.',
      ['19 cm'],
    ],
    [
      'Leikkaa pintaan molemmin puolin 4–5 noin 1⁄2 cm:n syvyistä viiltoa.',
      ['0.5 cm'],
    ],
    [
      'Flatten lightly with spatula to about 1cm / 4/5" thick.',
      ['1 cm = 0.8 in'],
    ],
    // "mm" in steps is millimetres.
    [
      'Tear off handfuls of dough about the size of a tangerine, or 100g/3½oz. Take one and flatten it with your hands to create a vaguely circular shape about 2mm/1/16in thick.',
      ['100 g = 3.5 oz', '2 mm = 0.063 in'],
    ],
  ],
  amounts: [
    ['Cooked squash should equal 2 cups.', ['2 cup']],
    [
      'Kaada taikina voideltuun, suorakaiteen muotoiseen 1,5 litran vetoiseen leipävuokaan.',
      ['1.5 l'],
    ],
    [
      'Put half the potato cubes in a heavy-based, buttered, 2-litre casserole dish.',
      ['2 l'],
    ],
    [
      'Minun salaattisoosini on 3 rkl rypäleöljyä,1 rkl sitruunamehua,1 tl Dijon-sinappia ja suolaa.',
      ['3 tbsp', '1 tbsp', '1 tsp'],
    ],
    [
      'Heat 1 tsp Birria oil over low heat, wipe pan with tortilla, remove, repeat x2 with 1/2 tsp oil each.',
      ['1 tsp', '0.5 tsp'],
    ],
    [
      'Add the bok choi and 75ml/3fl oz of water and stir fry until the bok choi is tender and the liquid evaporated.',
      ['75 ml = 3 fl-oz'],
    ],
    [
      'Process 200g (6½ ounces) of the biscuits until fine, chop remaining biscuits coarsely.',
      ['200 g = 6.5 oz'],
    ],
    [
      'Line 6-hole (¾-cup/180ml) texas muffin pan with paper cases.',
      ['0.75 cup = 180 ml'],
    ],
  ],
  'amounts in words': [
    [
      'Lisää kaksi desilitraa kuohukermaa, teelusikallinen suolaa sekä puoli teelusikallista mustapippuria.',
      ['2 dl', '1 tsp', '0.5 tsp'],
    ],
    [
      'Add one tablespoon of the vegetable oil, and when it is hot and slightly smoking, add the chicken and stir fry for 2-3 minutes, or until nearly cooked through.',
      ['1 tbsp'],
    ],
    [
      'Use a tablespoon or so of the sauce to coat the turkey, then place this on top.',
      ['1 tbsp'],
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
        const line = find(sentence)
        const found = scanStep(sentence, {
          language: line?.language ?? 'en',
          system: line?.system ?? 'us',
        })
        expect(found.map(describeStepQuantity)).toEqual(expected)
      })
    })
  }

  it('says where each match is in the text', () => {
    const sentence = 'Preheat oven to 350 degrees F (175 degrees C).'
    const found = scanStep(sentence, { language: 'en', system: 'us' })
    expect(found.map((q) => sentence.slice(q.at[0], q.at[1]))).toEqual([
      '350 degrees F',
      '175 degrees C',
    ])
  })

  it('handles every corpus sentence', () => {
    const counts = { temperature: 0, amount: 0, dimensions: 0, none: 0 }
    for (const sentence of stepSentences) {
      const found = scanStep(sentence.text, sentence)
      if (!found.length) counts.none++
      for (const q of found) {
        counts[q.type]++
        expect(q.at[0]).toBeGreaterThanOrEqual(0)
        expect(q.at[1]).toBeLessThanOrEqual(sentence.text.length)
      }
    }
    // A rule change that moves these numbers should be deliberate.
    expect(counts).toEqual({
      temperature: 266,
      amount: 302,
      dimensions: 29,
      none: 33,
    })
  })
})

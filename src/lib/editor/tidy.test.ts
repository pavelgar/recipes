import { describe, expect, it } from 'vitest'
import { tidiedSteps } from '@/lib/editor/tidy'

// Steps as the import takes them from pages that cut them in the wrong
// places (src/lib/import/extract.test.ts), each with an answer Tidy steps
// could give.

// https://jalotofu.fi/reseptit/rapeat-tofupalat-korean-fried-tofu-kft/
// runs its section headings onto the ends of steps.
const JALOTOFU = [
  'Valmista pikkelöity kaali-porkkanasalaatti:',
  'Viipaloi kaalit sekä porkkana esim. mandoliinilla ohueksi suikaleeksi ja siirrä kulhoon, lisää loput ainekset, sekoita ja anna maustua 30 min välillä sekoittaen. Paista tofut:',
  'Avaa tofut, valuta ja revi käsin varovasti paloiksi.',
].join('\n')

// https://www.myllynparas.fi/reseptit/kuorrutettu-kinkkupaistos cuts its
// sentences at commas and runs steps together.
const MYLLYNPARAS = [
  'Keitä Raketti Spagettia lihaliemessä 6 min pakkauksen ohjeen mukaan ja valuta lihaliemi talteen siivilän läpi. Älä huuhdo. Kaada Raketti Spagetti teflon-uunivuokaan. Sekoita palvikinkkusuikaleet',
  'sienet ja purjorenkaat sekä mausteet pastan sekaan.Kiehauta kastiketta varten kattilassa voissa vehnäjauho',
].join('\n')

// https://www.halfbakedharvest.com/buffalo-chicken-strombolis/ leaves out
// the space after a step's number.
const HALFBAKED =
  'Preheat the oven to 450° F. Line a baking sheet with parchment paper. 2.In a bowl, combine the chicken, buffalo sauce, cilantro, chives, and jalapeño.'

describe('tidiedSteps', () => {
  it('moves a heading run onto a step onto its own line', () => {
    const lines = [
      'Valmista pikkelöity kaali-porkkanasalaatti:',
      'Viipaloi kaalit sekä porkkana esim. mandoliinilla ohueksi suikaleeksi ja siirrä kulhoon, lisää loput ainekset, sekoita ja anna maustua 30 min välillä sekoittaen.',
      'Paista tofut:',
      'Avaa tofut, valuta ja revi käsin varovasti paloiksi.',
    ]
    expect(tidiedSteps(JALOTOFU, lines)).toBe(lines.join('\n'))
  })

  it('joins a step cut in two and splits steps run together', () => {
    const lines = [
      'Keitä Raketti Spagettia lihaliemessä 6 min pakkauksen ohjeen mukaan ja valuta lihaliemi talteen siivilän läpi. Älä huuhdo. Kaada Raketti Spagetti teflon-uunivuokaan. Sekoita palvikinkkusuikaleet sienet ja purjorenkaat sekä mausteet pastan sekaan.',
      'Kiehauta kastiketta varten kattilassa voissa vehnäjauho',
    ]
    expect(tidiedSteps(MYLLYNPARAS, lines)).toBe(lines.join('\n'))
  })

  it("drops a step's own number where it splits a line", () => {
    const lines = [
      'Preheat the oven to 450° F. Line a baking sheet with parchment paper.',
      'In a bowl, combine the chicken, buffalo sauce, cilantro, chives, and jalapeño.',
    ]
    expect(tidiedSteps(HALFBAKED, lines)).toBe(lines.join('\n'))
    // Keeping it is no harm either.
    expect(tidiedSteps(HALFBAKED, [lines[0], `2. ${lines[1]}`])).toBe(
      `${lines[0]}\n2. ${lines[1]}`,
    )
  })

  it('takes steps that need no tidying as they are', () => {
    expect(tidiedSteps(HALFBAKED, [HALFBAKED])).toBe(HALFBAKED)
  })

  it('rejects a word changed, added or left out', () => {
    // A comma left out.
    expect(
      tidiedSteps(HALFBAKED, [
        'Preheat the oven to 450° F. Line a baking sheet with parchment paper.',
        'In a bowl, combine the chicken, buffalo sauce, cilantro, chives and jalapeño.',
      ]),
    ).toBeNull()
    // A word changed.
    expect(
      tidiedSteps(MYLLYNPARAS, [
        MYLLYNPARAS.replace('Älä huuhdo', 'Älä huuhtele'),
      ]),
    ).toBeNull()
    // Converted.
    expect(
      tidiedSteps(HALFBAKED, [HALFBAKED.replace('450° F', '230 °C')]),
    ).toBeNull()
    // Translated.
    expect(
      tidiedSteps(MYLLYNPARAS, [
        'Cook the Raketti spaghetti in stock for 6 min.',
      ]),
    ).toBeNull()
    // A step left out.
    expect(tidiedSteps(JALOTOFU, JALOTOFU.split('\n').slice(0, 2))).toBeNull()
    // A heading made up.
    expect(
      tidiedSteps(JALOTOFU, ['Salaatti:', ...JALOTOFU.split('\n')]),
    ).toBeNull()
  })

  it("doesn't take an amount for a step's number", () => {
    const steps = 'Lisää 2.5 dl maitoa.'
    expect(tidiedSteps(steps, ['Lisää', '5 dl maitoa.'])).toBeNull()
    expect(tidiedSteps('2.5 dl maitoa', ['5 dl maitoa'])).toBeNull()
  })
})

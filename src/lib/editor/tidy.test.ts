import { describe, expect, it } from 'vitest'
import { tidiedAlready, tidiedSteps } from '@/lib/editor/tidy'

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

// Steps supplied by the user after copying a recipe page, including its
// hidden step-completion controls.
const SAARISTOLAISLEIPA = `Kuumenna piimä kädenlämpöiseksi. Murenna piimän joukkoon hiiva.
Vaihe 2 tehty2
Lisää siirappi, maltaat, kauraleseet, ruisjauhot ja suola.
Vaihe 3 tehty3
Alusta taikinaan vähitellen vehnäjauhot. Taikina saa jäädä löysäksi.
Vaihe 4 tehty4
Anna taikinan kohota leivinliinan alla lämpimässä, vedottomassa paikassa 1 1/2 tuntia.
Vaihe 5 tehty5
Jaa taikina kolmeen voideltuun suorakaiteen muotoiseen leipävuokaan (vetoisuus 1 1/2 l). Pistele haarukalla.
Vaihe 6 tehty6
Paista leipiä 175-asteisen uunin alimmalla tasolla noin 1 1/2 tuntia. Voitele leivät siirappivedellä, kun paistoaikaa on jäljellä vielä puoli tuntia. Peitä leivät tarvittaessa leivinpaperilla paistamisen loppupuolella, ettei pinta tummu liikaa.
Vaihe 7 tehty7
Kumoa leivät hieman jäähtyneinä vuoista.
Vaihe 8 tehty8
Kääri täysin jäähtyneet leivät muoviin. Saaristolaisleipä on parhaimmillaan parin päivän kuluttua.`

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

  it('removes explicitly identified copied page controls, preserving all cooking text', () => {
    const removedLines = [1, 3, 5, 7, 9, 11, 13]
    const lines = SAARISTOLAISLEIPA.split('\n').filter(
      (_, index) => !removedLines.includes(index),
    )
    expect(tidiedSteps(SAARISTOLAISLEIPA, lines, removedLines)).toBe(
      lines.join('\n'),
    )
    // An unaccounted omission must still be rejected.
    expect(tidiedSteps(SAARISTOLAISLEIPA, lines)).toBeNull()
    expect(
      tidiedSteps(SAARISTOLAISLEIPA, lines.slice(1), removedLines),
    ).toBeNull()
    expect(
      tidiedSteps(
        SAARISTOLAISLEIPA,
        lines.map((line) => line.replace('1 1/2', '11/2')),
        removedLines,
      ),
    ).toBeNull()
  })

  it('allows page clutter in any language without site-specific patterns', () => {
    const source = [
      'Print recipe',
      ...JALOTOFU.split('\n'),
      'Share',
      'Advertisement',
    ].join('\n')
    expect(tidiedSteps(source, JALOTOFU.split('\n'), [0, 4, 5])).toBe(JALOTOFU)
  })

  it('rejects invalid removal indices and an answer that removes every instruction', () => {
    for (const removedLines of [[-1], [1.5], [99], [NaN], [Infinity], [0]]) {
      expect(tidiedSteps('Sekoita.', [], removedLines)).toBeNull()
    }
  })

  it('takes steps that need no tidying as they are', () => {
    expect(tidiedSteps(HALFBAKED, [HALFBAKED])).toBe(HALFBAKED)
  })

  it('rejects spaces added or removed inside a line', () => {
    expect(
      tidiedSteps('Lisää 1 1/2 dl maitoa.', ['Lisää 11/2 dl maitoa.']),
    ).toBeNull()
    expect(tidiedSteps('Add 1 2 dl.', ['Add 12 dl.'])).toBeNull()
    expect(tidiedSteps('Mix flour.', ['Mix fl our.'])).toBeNull()
  })

  it('normalises Unicode and spacing without changing the steps', () => {
    const steps = '  Lisää  maitoa.  \n\nSekoita. '
    expect(tidiedSteps(steps.normalize('NFD'), steps.split('\n'))).toBe(
      tidiedAlready(steps.normalize('NFD')),
    )
    expect(tidiedAlready(steps.normalize('NFD'))).toBe(
      'Lisää maitoa.\nSekoita.',
    )
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

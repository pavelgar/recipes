import { describe, expect, it } from 'vitest'
import {
  articleCounts,
  isMaustemitta,
  mayPrecedeHyphen,
  scaleLetterIsTemperature,
} from '@/lib/quantities/ambiguity'
import { parseIngredient } from '@/lib/quantities/ingredient'
import { scanStep } from '@/lib/quantities/steps'
import { ingredientLines, stepSentences } from '@/test/corpus'
import { describeIngredient, describeStep } from '@/test/quantities'

// Each rule in ambiguity.ts, both ways. Sentences and lines come from the
// corpus; where the corpus has no example, the test uses the shortest text
// that shows the notation and says so.

const step = (sentence: string) => {
  const line = stepSentences.find((s) => s.text === sentence)
  expect(line, sentence).toBeDefined()
  return describeStep(
    sentence,
    scanStep(sentence, line ?? { language: 'en', system: 'us' }),
  )
}

const ingredient = (text: string) => {
  const line = ingredientLines.find((l) => l.text === text)
  expect(line, text).toBeDefined()
  return describeIngredient(
    parseIngredient(text, line ?? { language: 'en', system: 'us' }),
  )
}

describe('a unit followed by a hyphen', () => {
  it('is a unit when a size word follows', () => {
    expect(
      step(
        'Grease a deep 19cm-square cake pan, line base and two opposite sides with baking paper.',
      ),
    ).toEqual(['19 cm  [19cm]'])
  })

  it('is part of another word after in, l, t and c (notation)', () => {
    for (const word of ['in', 'L', 'T', 'c']) {
      expect(mayPrecedeHyphen(word), word).toBe(false)
    }
    expect(mayPrecedeHyphen('cm')).toBe(true)
  })
})

describe('a bare "in"', () => {
  it('is inches before a size word or a full stop', () => {
    expect(
      step(
        'Shape dough into 1-in. balls; place 2 in. apart on ungreased baking sheets.',
      ),
    ).toEqual(['1 in  [1-in]', '2 in  [2 in]'])
  })

  it('is the preposition otherwise', () => {
    expect(step('Wrap two in cling film and freeze for another time.')).toEqual(
      [],
    )
    expect(
      step('Repeat with remaining butter and batter to make 16 in total.'),
    ).toEqual([])
  })
})

describe('a bare C or F', () => {
  it('is a temperature from 25 up', () => {
    expect(step('Laita taikina uuniin ja paista 200 C n. 30 min')).toEqual([
      '200 °C  [200 C]',
    ])
  })

  it('is not a temperature below that (notation)', () => {
    expect(scaleLetterIsTemperature(2)).toBe(false)
    expect(scaleLetterIsTemperature(-18)).toBe(true)
  })
})

describe('a degree sign without a scale', () => {
  it('is an angle in a turn', () => {
    expect(step('Bake 65 minutes, rotating tray 180° at 45 minutes.')).toEqual(
      [],
    )
    expect(
      step(
        'Fold the dough into thirds like a business letter, then turn it 90°.',
      ),
    ).toEqual([])
  })

  it('is a temperature otherwise', () => {
    expect(step('220° 30-45min')).toEqual(['220 ?°C  [220°]'])
  })
})

describe('"N x" before a size', () => {
  it('counts tins', () => {
    expect(
      step(
        'Grease and line the base and sides of 3 x 20cm cake tins with baking parchment.',
      ),
    ).toEqual(['20 cm  [20cm]'])
  })

  it('is a side of the size otherwise', () => {
    // Written with thin spaces around the ×.
    expect(
      step(
        'Kauli sulaneet taikinalevyt noin 12\u2009×\u200924 cm kokoisiksi levyiksi.',
      ),
    ).toEqual(['~12x24 cm  [12\u2009×\u200924 cm]'])
  })
})

describe('"mm"', () => {
  it('is millimetres later in a line', () => {
    expect(
      ingredient(
        '500g/1lb 2oz  forced rhubarb (trimmed weight), washed and cut into 5mm/¼in thick slices',
      ),
    ).toBe(
      'measured 500 g = 1.125 lb | more fixed 5 mm = 0.25 in  [500g] [1lb 2oz] [5mm] [¼in]',
    )
  })

  // The corpus has no "mm" meaning maustemitta.
  it('is maustemitta as the first amount of a Finnish line (notation)', () => {
    expect(isMaustemitta('1 mm suolaa', [2, 4], 'fi', true)).toBe(true)
    expect(isMaustemitta('1 mm suolaa', [2, 4], 'fi', false)).toBe(false)
    expect(isMaustemitta('1 mm salt', [2, 4], 'en', true)).toBe(false)
    expect(
      describeIngredient(
        parseIngredient('1 mm suolaa', { language: 'fi', system: 'metric' }),
      ),
    ).toBe('measured 1 maustemitta  [1 mm]')
  })
})

describe('"a" or "an" before a unit', () => {
  it('is an amount with "of" after it', () => {
    expect(
      step(
        'Use a tablespoon or so of the sauce to coat the turkey, then place this on top.',
      ),
    ).toEqual(['1 tbsp  [a tablespoon]'])
  })

  it('is not otherwise', () => {
    expect(step('A tablespoon cookie scoop works well here.')).toEqual([])
    const text = 'A tablespoon cookie scoop'
    expect(articleCounts(text, 'A tablespoon'.length)).toBe(false)
  })
})

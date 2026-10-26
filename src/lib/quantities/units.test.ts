import { describe, expect, it } from 'vitest'
import { readQuantity } from '@/lib/quantities/quantity'
import { formsOf, readUnit, UNITS } from '@/lib/quantities/units'

describe('readUnit', () => {
  // Independent sourced spellings: deriving both forms and expected ids
  // from UNITS would allow an accidentally deleted alias to go unnoticed.
  it.each([
    // https://www.arla.fi/reseptit/kahvi-karamellisiirapilla/
    ['kuppi', 'fi', 'cup', 'volume'],
    // https://www.bettycrocker.com/recipes/cake-pop-cake/c7589264-a09b-4e37-bed0-28a22fca264c
    ['bag', 'en', 'bag', 'package'],
    // https://www.bettycrocker.com/recipes/christmas-lights-cupcakes/3e19f67b-42f5-4b9a-a0ad-fd394cb2fd63
    ['tub', 'en', 'tub', 'package'],
    // https://www.soppa365.fi/reseptit/kasvis-arjen-nopeat-juhli-ja-nauti-salaatit/kuningasperunasalaatti
    ['ruukku', 'fi', 'rku', 'package'],
    // https://www.valio.fi/reseptit/nopea-tortillalasagne/
    ['pussi', 'fi', 'pss', 'package'],
    // https://www.womensweeklyfood.com.au/recipe/dinner/vietnamese-beef-pho-13636/
    ['grams', 'en', 'g', 'weight'],
    // https://www.recipetineats.com/italian-almond-cookies-ricciarelli/
    ['drops', 'en', 'drop', 'pinch'],
  ] as const)('reads the sourced spelling %s', (text, language, id, kind) => {
    expect(readUnit(text, 0, language)?.unit).toMatchObject({ id, kind })
  })

  it('reads every form in any case', () => {
    for (const { id } of UNITS) {
      for (const form of formsOf(id)) {
        for (const written of [form, form.toUpperCase()]) {
          expect(readUnit(written, 0, 'fi')?.unit.id, written).toBe(id)
        }
      }
    }
  })

  it('reads mm as millimetres; the line decides when it is maustemitta', () => {
    expect(readUnit('mm', 0, 'fi')?.unit.id).toBe('mm')
  })

  it.each([
    ['boxes', 'box'],
    ['bunches', 'bunch'],
    ['inches', 'in'],
    ['fluid ounces', 'fl-oz'],
    ['millilitres', 'ml'],
    ['milliliters', 'ml'],
  ])('reads the English plural %s as %s', (word, unit) => {
    expect(readUnit(word, 0, 'en')?.unit.id).toBe(unit)
  })

  it('needs the word to end', () => {
    expect(readUnit('garlic', 0, 'en')).toBeNull()
    expect(readUnit('levyä', 0, 'fi')?.unit.id).toBe('levy')
    expect(readUnit('lehtitaikinalevyä', 0, 'fi')).toBeNull()
  })

  it('reads hyphenated words as units except after in, l, t and c', () => {
    expect(readUnit('cm-square', 0, 'en')?.unit.id).toBe('cm')
    expect(readUnit('in-season', 0, 'en')).toBeNull()
    expect(readUnit('L-kokoista', 0, 'fi')).toBeNull()
    expect(readUnit('T-bone', 0, 'en')).toBeNull()
  })

  // Not in the corpus, but how US cookbooks abbreviate.
  it('reads T, t and c as spoons and cups only in English and in that case', () => {
    expect(readUnit('T', 0, 'en')?.unit.id).toBe('tbsp')
    expect(readUnit('t', 0, 'en')?.unit.id).toBe('tsp')
    expect(readUnit('c', 0, 'en')?.unit.id).toBe('cup')
    expect(readUnit('C', 0, 'en')?.unit.id).toBe('cup')
    // "1 t" is an hour in Finnish ("1 t" = 1 tunti).
    expect(readUnit('t', 0, 'fi')).toBeNull()
    expect(readUnit('tb', 0, 'en')).toBeNull()
  })

  it('reads inch marks only when glued to the number', () => {
    const opts = { language: 'en' } as const
    expect(readQuantity('1/3" wide', 0, opts)?.unit?.id).toBe('in')
    expect(readQuantity('2 "', 0, opts)?.unit).toBeNull()
  })
})

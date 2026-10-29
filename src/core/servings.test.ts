import { describe, expect, it } from 'vitest'
import { scaleServings, servingsCount, servingsStep } from '@/core/servings'
import type { Language } from '@/core/quantities'

// Yields from the corpus (corpus/ingredients), as sites publish them.

describe('servingsCount', () => {
  it.each<[string, Language, number]>([
    ['12 annosta', 'fi', 12],
    ['Serves 8-10', 'en', 8],
    ['10–12 palaa', 'fi', 10],
    ['Makes 24 halves', 'en', 24],
    ['2,5 dl', 'fi', 2.5],
    ['2 1/2 dozen', 'en', 2.5],
    ['12', 'en', 12],
    // Sizes of what's made aren't counts of it.
    ['one 9" x 4" loaf', 'en', 1],
    ['1 - 9x13 inch pan', 'en', 1],
    ['one 1 1/2-pound loaf', 'en', 1],
    ['one dozen 8” to 10” crêpes', 'en', 1],
  ])('reads %s as %d', (written, language, count) => {
    expect(servingsCount(written, language)).toBe(count)
  })

  // Notation tests: servings without a number.
  it.each([null, '', 'a crowd'])('finds no number in %j', (written) => {
    expect(servingsCount(written, 'en')).toBeNull()
  })

  it('reads only digits in a language the app has no rules for', () => {
    expect(servingsCount('4 porciones', null)).toBe(4)
    expect(servingsCount('one loaf', null)).toBeNull()
  })
})

describe('scaleServings', () => {
  it.each<[string, Language, number, string]>([
    ['12 annosta', 'fi', 2, '24 annosta'],
    ['Serves 8-10', 'en', 1.5, 'Serves 12-15'],
    ['8–10 annosta', 'fi', 0.5, '4–5 annosta'],
    ['Makes about 650ml/21fl oz', 'en', 2, 'Makes about 1300ml/42fl oz'],
    ['2 1/2 dozen', 'en', 2, '5 dozen'],
    ['4 people (25 meatballs)', 'en', 1.25, '5 people (31.3 meatballs)'],
  ])('scales %s by %d', (written, language, factor, scaled) => {
    expect(scaleServings(written, factor, language)).toBe(scaled)
  })

  it.each<[string, number, string]>([
    ['1 - 9x13 inch pan', 2, '2 - 9x13 inch pan'],
    ['2 (9-inch) pies', 1.5, '3 (9-inch) pies'],
    ['one 9" x 4" loaf', 2, 'two 9" x 4" loaf'],
    ['one 8” square or 9” round pan', 2, 'two 8” square or 9” round pan'],
    ['one 1 1/2-pound loaf', 3, 'three 1 1/2-pound loaf'],
  ])('keeps the sizes in %s', (written, factor, scaled) => {
    expect(scaleServings(written, factor, 'en')).toBe(scaled)
  })

  it('writes decimals as the recipe does', () => {
    expect(scaleServings('2–4 annosta', 1.25, 'fi')).toBe('2,5–5 annosta')
    expect(scaleServings('Serves 2', 1.25, 'en')).toBe('Serves 2.5')
  })

  // Notation tests: number words and fraction glyphs.
  it('writes words and fractions as the recipe does', () => {
    expect(scaleServings('kaksi vuokaa', 1.5, 'fi')).toBe('kolme vuokaa')
    expect(scaleServings('Kaksi vuokaa', 1.25, 'fi')).toBe('2,5 vuokaa')
    expect(scaleServings('Makes 1½ dozen', 2, 'en')).toBe('Makes 3 dozen')
    expect(scaleServings('Makes 1½ dozen', 1.5, 'en')).toBe('Makes 2¼ dozen')
  })
})

describe('servingsStep', () => {
  it.each([
    [12, 1],
    [4, 1],
    [2, 0.5],
    [null, 1],
  ])('moves %j servings by %d', (count, step) => {
    expect(servingsStep(count)).toBe(step)
  })
})

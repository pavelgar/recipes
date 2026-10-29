import { describe, expect, it } from 'vitest'
import {
  agreeingWord,
  formatDecimal,
  formatFraction,
  formatTemperature,
  numberWord,
} from '@/core/quantities/format'
import { readUnit, UNIT_WORDS } from '@/core/quantities/units'

describe('unit words', () => {
  it('pairs forms that read as the same unit', () => {
    for (const language of ['en', 'fi'] as const) {
      for (const [singular, plural] of UNIT_WORDS[language]) {
        const one = readUnit(singular, 0, language)
        const many = readUnit(plural, 0, language)
        expect(one?.end, singular).toBe(singular.length)
        expect(many?.end, plural).toBe(plural.length)
        expect(many?.unit.id, plural).toBe(one?.unit.id)
      }
    }
  })

  it.each([
    ['cup', 2, 'en', 'cups'],
    ['cups', 1, 'en', 'cup'],
    ['cups', 0.5, 'en', 'cup'],
    ['Teaspoon', 1.5, 'en', 'Teaspoons'],
    ['purkki', 2, 'fi', 'purkkia'],
    ['purkki', 0.5, 'fi', 'purkkia'],
    ['teelusikallista', 1, 'fi', 'teelusikallinen'],
    ['kilo', 2, 'fi', 'kiloa'],
    ['kilo', 2, 'en', 'kilos'],
  ] as const)('%s with %s in %s → %s', (word, value, language, expected) => {
    expect(agreeingWord(word, value, language)).toBe(expected)
  })

  it('leaves abbreviations, genitives and agreeing words alone', () => {
    expect(agreeingWord('dl', 2, 'fi')).toBeNull()
    expect(agreeingWord('tbsp', 2, 'en')).toBeNull()
    expect(agreeingWord('litran', 2, 'fi')).toBeNull()
    expect(agreeingWord('cups', 2, 'en')).toBeNull()
  })
})

describe('numbers', () => {
  it.each([
    [1.5, {}, '1½'],
    [0.75, {}, '¾'],
    [2, {}, '2'],
    [1.5, { joiner: ' ' }, '1 ½'],
    [1.5, { slash: true }, '1 1/2'],
    [2.25, { slash: true, joiner: '-' }, '2-1/4'],
    [0.375, { slash: true }, '3/8'],
    [2 / 3, { slash: true }, '2/3'],
    [1 / 5, {}, '0.2'],
    [1 / 6, {}, '0.17'],
  ])('%s %j → %s', (n, style, expected) => {
    expect(formatFraction(n, style)).toBe(expected)
  })

  it('writes decimals with the language separator', () => {
    expect(formatDecimal(2.37, 'fi')).toBe('2,4')
    expect(formatDecimal(2.37, 'en')).toBe('2.4')
    expect(formatDecimal(2, 'fi')).toBe('2')
    expect(formatDecimal(0.75, 'fi', 2)).toBe('0,75')
  })

  it.each([
    [2, 'one', 'en', 'two'],
    [3, 'Kaksi', 'fi', 'Kolme'],
    [1.5, 'one', 'en', null],
    [13, 'one', 'en', null],
    [12, 'one', 'en', 'twelve'],
    [10, 'Yksi', 'fi', 'Kymmenen'],
    [11, 'yksi', 'fi', null],
  ] as const)('%s like %s in %s → %s', (n, like, language, expected) => {
    expect(numberWord(n, like, language)).toBe(expected)
  })
})

describe('temperatures', () => {
  it('follows each language', () => {
    expect(formatTemperature(180, 'C', 'fi')).toBe('180 °C')
    expect(formatTemperature(350, 'F', 'en')).toBe('350°F')
    expect(formatTemperature({ min: 175, max: 190 }, 'C', 'en')).toBe(
      '175–190°C',
    )
  })
})

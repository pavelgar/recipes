import { describe, expect, it } from 'vitest'
import {
  approximateBefore,
  readNumber,
  readNumberWord,
} from '@/lib/quantities/numbers'
import { readQuantity } from '@/lib/quantities/quantity'
import { describeValue } from '@/test/quantities'
import type { Language } from '@/lib/quantities/numbers'

// Notation tests: the shortest text that shows each way of writing a
// number. Whole recipe lines are tested against the corpus elsewhere.

describe('readNumber', () => {
  it.each([
    ['2', 2, 'integer'],
    ['1,5', 1.5, 'decimal'],
    ['1.5', 1.5, 'decimal'],
    ['½', 0.5, 'fraction'],
    ['1½', 1.5, 'fraction'],
    ['1 ½', 1.5, 'fraction'],
    ['1/2', 0.5, 'fraction'],
    ['1⁄2', 0.5, 'fraction'],
    ['1 1/2', 1.5, 'fraction'],
    ['2 2/3', 2.667, 'fraction'],
    ['1-1/2', 1.5, 'fraction'],
    ['1‑1/2', 1.5, 'fraction'],
    ['.25', 0.25, 'decimal'],
  ])('%s', (text, value, form) => {
    const match = readNumber(text, 0, 'fi')
    expect(match && describeValue(match.value)).toBe(String(value))
    expect(match?.form).toBe(form)
    expect(match?.end).toBe(text.length)
  })

  it('reads 1,000 as a thousand only in English', () => {
    expect(readNumber('1,000', 0, 'en')).toMatchObject({
      value: 1000,
      form: 'integer',
    })
    expect(readNumber('1,000', 0, 'fi')?.value).toBe(1)
  })

  it('reads a half or a fraction joined with "and" or "ja"', () => {
    expect(readNumber('1 and 1/2', 0, 'en')).toMatchObject({
      value: 1.5,
      end: 9,
      form: 'fraction',
    })
    expect(readNumber('2 and a half', 0, 'en')?.value).toBe(2.5)
    expect(readNumberWord('one and a half', 0, 'en')).toMatchObject({
      value: 1.5,
      form: 'word',
    })
    expect(readNumberWord('kolme ja puoli', 0, 'fi')?.value).toBe(3.5)
  })

  it('reads no number with leading zeros: the 000 of "1 000 g"', () => {
    expect(readNumber('000', 0, 'fi')).toBeNull()
  })
})

describe('readQuantity', () => {
  const read = (text: string, language: Language = 'en') => {
    const q = readQuantity(text, 0, { language })
    return (
      q &&
      `${describeValue(q.value)} ${q.unit?.id ?? '-'} ${text.slice(q.start, q.end)}`
    )
  }

  it.each([
    ['2 - 4 dl', '2-4 dl 2 - 4 dl'],
    ['2 – 4 dl', '2-4 dl 2 – 4 dl'],
    ['2−4 dl', '2-4 dl 2−4 dl'],
    ['½-1 palaa', '0.5-1 pala ½-1 palaa'],
    ['1/2 to 1 teaspoon', '0.5-1 tsp 1/2 to 1 teaspoon'],
    ['7- or 8-oz', '7-8 oz 7- or 8-oz'],
    ['198g to 255g', '198-255 g 198g to 255g'],
    ['350 - 400g', '350-400 g 350 - 400g'],
    ['1lb 5oz', '1.313 lb 1lb 5oz'],
    ['3 to 2 cups', '3 - 3'],
    ['2 tbsp to 3 eggs', '2 tbsp 2 tbsp'],
    ['2 scant cups', '2 cup 2 scant cups'],
    ['2 large eggs', '2 - 2'],
  ])('%s', (text, expected) => {
    expect(read(text)).toBe(expected)
  })

  it('marks words such as "heaped" as approximate, except "level"', () => {
    expect(readQuantity('1 heaped tsp', 0, { language: 'en' })).toMatchObject({
      approximate: true,
    })
    expect(readQuantity('1 level tsp', 0, { language: 'en' })).toMatchObject({
      approximate: false,
    })
  })

  it('treats a number followed by % as no amount', () => {
    expect(read('0,2 %', 'fi')).toBeNull()
    expect(read('77%', 'fi')).toBeNull()
  })
})

describe('approximateBefore', () => {
  it.each([
    ['about 400g', 6, true],
    ['n. 5dl', 3, true],
    ['noin 2 dl', 5, true],
    ['~4', 1, true],
    ['400g', 0, false],
    ['pound 2', 6, false],
  ])('%s', (text, pos, expected) => {
    expect(approximateBefore(text, pos)).toBe(expected)
  })
})

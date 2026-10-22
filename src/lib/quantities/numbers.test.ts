import { describe, expect, it } from 'vitest'
import { readNumber } from '@/lib/quantities/numbers'
import { readQuantity } from '@/lib/quantities/quantity'
import { describeValue } from '@/test/quantities'
import type { Language } from '@/lib/quantities/numbers'
import type { ReadOptions } from '@/lib/quantities/quantity'

describe('readNumber', () => {
  it.each([
    ['2', 2],
    ['1,5', 1.5],
    ['1.5', 1.5],
    ['½', 0.5],
    ['1½', 1.5],
    ['1 ½', 1.5],
    ['1/2', 0.5],
    ['1⁄2', 0.5],
    ['1 1/2', 1.5],
    ['2 2/3', 2.667],
    ['.25', 0.25],
  ])('%s', (text, expected) => {
    const match = readNumber(text, 0, 'fi')
    expect(match && describeValue(match.value)).toBe(String(expected))
    expect(match?.end).toBe(text.length)
  })

  it('reads 1,000 as a thousand only in English', () => {
    expect(readNumber('1,000', 0, 'en')?.value).toBe(1000)
    expect(readNumber('1,000', 0, 'fi')?.value).toBe(1)
  })
})

describe('readQuantity', () => {
  const read = (text: string, language: Language = 'en') => {
    const opts: ReadOptions = { language, context: 'other', hyphens: false }
    const q = readQuantity(text, 0, opts)
    return (
      q &&
      `${describeValue(q.value)} ${q.unit?.id ?? '-'} ${text.slice(q.start, q.end)}`
    )
  }

  it.each([
    ['2 - 4 dl', '2-4 dl 2 - 4 dl'],
    ['½-1 palaa', '0.5-1 pala ½-1 palaa'],
    ['1/2 to 1 teaspoon', '0.5-1 tsp 1/2 to 1 teaspoon'],
    ['198g to 255g', '198-255 g 198g to 255g'],
    ['350 - 400g', '350-400 g 350 - 400g'],
    ['1lb 5oz', '1.313 lb 1lb 5oz'],
    ['3 to 2 cups', '3 - 3'],
    ['2 tbsp to 3 eggs', '2 tbsp 2 tbsp'],
  ])('%s', (text, expected) => {
    expect(read(text)).toBe(expected)
  })

  it('treats a number followed by % as no amount', () => {
    expect(read('0,2 %', 'fi')).toBeNull()
    expect(read('77%', 'fi')).toBeNull()
  })
})

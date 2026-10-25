import { describe, expect, it } from 'vitest'
import { guessMeasuringSystem } from '@/lib/measuring-system'
import { ingredientLines } from '@/test/corpus'

describe('guessMeasuringSystem', () => {
  // Rule check: every corpus site comes out as its country measures.
  const sites = new Map(ingredientLines.map((line) => [line.site, line]))
  it.each([...sites.values()])('guesses $system for $site', (line) => {
    expect(guessMeasuringSystem(line.site, line.language)).toBe(line.system)
  })

  // Notation tests: the site says more than the language.
  it('keeps a Finnish site metric in English', () => {
    expect(guessMeasuringSystem('valio.fi', 'en')).toBe('metric')
  })

  it.each([
    ['en', 'us'],
    ['fi', 'metric'],
  ] as const)(
    'guesses a %s recipe without a site as %s',
    (language, system) => {
      expect(guessMeasuringSystem(null, language)).toBe(system)
    },
  )
})

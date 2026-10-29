import { describe, expect, it } from 'vitest'
import { guessMeasuringSystem } from '@/core/measuring-system'
import { ingredientLines } from '@/testing/corpus'

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

  // Notation tests: a recipe without a site goes by its language's most
  // likely region.
  it.each([
    ['sv', 'metric'],
    ['sco', 'british'],
    ['und', 'metric'],
  ])('guesses a %s recipe without a site as %s', (language, system) => {
    expect(guessMeasuringSystem(null, language)).toBe(system)
  })

  // Notation tests: the region a page states with its language, on a site
  // whose domain doesn't say its country.
  it.each([
    ['GB', 'british'],
    ['AU', 'australian'],
    ['US', 'us'],
    ['NZ', 'metric'],
  ])('guesses an English recipe stated as %s as %s', (region, system) => {
    expect(guessMeasuringSystem('example.com', 'en', region)).toBe(system)
  })

  it('goes by the domain before the region a page states', () => {
    expect(guessMeasuringSystem('example.co.uk', 'en', 'US')).toBe('british')
  })

  it('knows a British site on .com', () => {
    expect(guessMeasuringSystem('jamieoliver.com', 'en')).toBe('british')
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

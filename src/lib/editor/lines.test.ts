import { describe, expect, it } from 'vitest'
import {
  isHeading,
  marksOf,
  sectionsFromText,
  textFromSections,
} from '@/lib/editor/lines'
import { ingredientLines } from '@/test/corpus'

const fi = { language: 'fi', system: 'metric' } as const
const en = { language: 'en', system: 'us' } as const

// https://kotiliesi.fi/resepti/etikkasilakat/, as the importer reads it.
const ETIKKASILAKAT = [
  '8 silakkafileetä',
  'korppujauhoja',
  'suolaa, pippuria',
  '1 sipuli',
  '2 rkl voita',
  'Etikkaliemi:',
  '1 dl etikkaa',
  '2 dl sokeria',
  '3 dl vettä',
].join('\n')

describe('isHeading', () => {
  // Rule check: in the corpus, every ingredient line that ends with a colon
  // is a heading ("Etikkaliemi:", "ICING:", "kakun kuorrutus:").
  const colonLines = ingredientLines.filter((line) =>
    line.text.trim().endsWith(':'),
  )
  it.each(colonLines)('reads $site "$text" as a heading', (line) => {
    expect(
      isHeading(line.text, 'ingredient', {
        language: line.language,
        system: line.system,
      }),
    ).toBe(true)
  })

  // Notation tests: a line with an amount isn't a heading, colon or not.
  it.each(['2 dl vettä:', '1 dl:'])('reads %j as a line', (line) => {
    expect(isHeading(line, 'ingredient', fi)).toBe(false)
  })

  it('reads a step with a temperature as a step', () => {
    expect(isHeading('Paista 200 asteessa:', 'step', fi)).toBe(false)
  })
})

describe('sectionsFromText', () => {
  it('makes a section from each heading', () => {
    expect(sectionsFromText(ETIKKASILAKAT, 'ingredient', fi)).toEqual([
      {
        heading: null,
        lines: [
          '8 silakkafileetä',
          'korppujauhoja',
          'suolaa, pippuria',
          '1 sipuli',
          '2 rkl voita',
        ],
      },
      {
        heading: 'Etikkaliemi',
        lines: ['1 dl etikkaa', '2 dl sokeria', '3 dl vettä'],
      },
    ])
  })

  it('skips blank lines and headings without lines', () => {
    expect(
      sectionsFromText('\n  1 sipuli  \n\nEtikkaliemi:\n', 'ingredient', fi),
    ).toEqual([{ heading: null, lines: ['1 sipuli'] }])
  })

  it('gives the text back as it was', () => {
    const sections = sectionsFromText(ETIKKASILAKAT, 'ingredient', fi)
    expect(textFromSections(sections)).toBe(ETIKKASILAKAT)
  })
})

describe('textFromSections', () => {
  // https://www.recipetineats.com/birria-tacos/ names a step section
  // "Prepare chillis:".
  it('ends each heading with one colon', () => {
    expect(
      textFromSections([
        { heading: 'Prepare chillis:', lines: ['Simmer chopped chillies.'] },
      ]),
    ).toBe('Prepare chillis:\nSimmer chopped chillies.')
  })
})

describe('marksOf', () => {
  it('marks the amount and unit', () => {
    expect(marksOf('2 rkl voita', 'ingredient', fi)).toEqual([
      { start: 0, end: 5, kind: 'quantity' },
    ])
  })

  it('marks every amount in a line', () => {
    expect(marksOf('4 tablespoons (57g) butter', 'ingredient', en)).toEqual([
      { start: 0, end: 13, kind: 'quantity' },
      { start: 15, end: 18, kind: 'quantity' },
    ])
  })

  it('marks a heading', () => {
    expect(marksOf('Etikkaliemi:', 'ingredient', fi)).toEqual([
      { start: 0, end: 12, kind: 'heading' },
    ])
  })

  it('leaves a line without an amount alone', () => {
    expect(marksOf('suolaa, pippuria', 'ingredient', fi)).toEqual([])
  })

  // kotikokki.net writes the amount after the ingredient.
  it('leaves a number the app couldn’t place alone', () => {
    expect(marksOf('Fetaa 1', 'ingredient', fi)).toEqual([])
  })

  it('marks temperatures and amounts in a step', () => {
    const step =
      'Kaada taikina vuokaan leivinpaperin päälle ja paista 200-asteisessa uunissa 1 h 15 min. tai kunnes kakun pinta on tummanruskea.'
    expect(
      marksOf(step, 'step', fi).map(({ start, end }) => step.slice(start, end)),
    ).toEqual(['200-asteisessa'])
  })
})

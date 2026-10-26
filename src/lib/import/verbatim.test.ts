import { describe, expect, it } from 'vitest'
import { sourceChecker } from '@/lib/import/verbatim'

// https://www.meillakotona.fi/reseptit/kermainen-kanapata, a step as the
// page publishes it, cut across two lines here as a page's paragraphs can
// cut one.
const SOURCE =
  'Lisää pataan vesi, kerma ja mausteet ja\nsekoita.Siirrä pata 225-asteisen uunin alaosaan ja kypsennä 15 minuuttia.'

describe('sourceChecker', () => {
  const check = sourceChecker(SOURCE)

  it('finds a line written as in the source, across its line breaks', () => {
    expect(check('Lisää pataan vesi, kerma ja mausteet ja sekoita.')).toEqual({
      text: 'Lisää pataan vesi, kerma ja mausteet ja sekoita.',
      found: true,
    })
    expect(check('  Siirrä pata 225-asteisen   uunin alaosaan')).toEqual({
      text: 'Siirrä pata 225-asteisen uunin alaosaan',
      found: true,
    })
  })

  it('takes a line written in other letter case as the source writes it', () => {
    expect(check('siirrä PATA 225-asteisen uunin alaosaan')).toEqual({
      text: 'Siirrä pata 225-asteisen uunin alaosaan',
      found: true,
    })
  })

  it("keeps a line that isn't in the source as written, to mark", () => {
    // Converted, corrected and translated.
    for (const line of [
      'Siirrä pata 440 °F uunin alaosaan',
      'Lisää pataan vesi, kerma ja mausteet ja sekoita. Siirrä pata',
      'Move the pot to the bottom of a 225 °C oven',
    ]) {
      expect(check(line)).toEqual({ text: line, found: false })
    }
  })

  it('compares Unicode in one form', () => {
    // "ä" as a + combining diaeresis, as some keyboards write it.
    expect(check('Lisa\u0308a\u0308 pataan vesi').found).toBe(true)
  })
})

describe('sourceChecker on short lines', () => {
  it('finds them only as whole words and numbers', () => {
    const check = sourceChecker('Laske uunin lämpö 175 asteeseen.\n4 annosta')
    expect(check('4').found).toBe(true)
    expect(check('17').found).toBe(false)
    expect(check('uuni').found).toBe(false)
    expect(check('175 asteeseen').found).toBe(true)
  })
})

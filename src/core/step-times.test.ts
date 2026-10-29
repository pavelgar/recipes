import { describe, expect, it } from 'vitest'
import { formatClock, splitTimes } from '@/core/step-times'
import type { Language } from '@/core/quantities'

// The times found in a step, as [text, seconds].
const times = (text: string, language: Language) =>
  splitTimes(text, language).flatMap((part) =>
    typeof part === 'string' ? [] : [[part.text, part.seconds]],
  )

describe('splitTimes', () => {
  // Step sentences from the corpus (corpus/steps).
  it.each<[string, Language, Array<[string, number]>]>([
    ['Paista 225 asteessa 30 minuuttia.', 'fi', [['30 minuuttia', 1800]]],
    [
      'Paista marenkeja 95-asteisessa uunissa noin 2 tuntia.',
      'fi',
      [['2 tuntia', 7200]],
    ],
    [
      'Säädä sirkulaattoriin tavoitelämpötilaksi 80 astetta ja kypsennä 1,5 tuntia.',
      'fi',
      [['1,5 tuntia', 5400]],
    ],
    [
      'Paista 225-asteisen uunin keskitasolla 6–8 minuuttia, kunnes pinta on kauniin ruskea.',
      'fi',
      [['6–8 minuuttia', 360]],
    ],
    [
      'Pistä uuniin 180 asteeseen n 30 - 45 min.',
      'fi',
      [['30 - 45 min', 1800]],
    ],
    ['220° 30-45min', 'fi', [['30-45min', 1800]]],
    ['Kiehauta ja keitä noin 30 sekuntia.', 'fi', [['30 sekuntia', 30]]],
    [
      'Add the onion to the pan with a pinch of salt and fry for 5–7 minutes, until very soft.',
      'en',
      [['5–7 minutes', 300]],
    ],
    [
      'Let cook, stirring occasionally, until the sauce reduces to about 2/3 cup, 5 to 8 minutes.',
      'en',
      [['5 to 8 minutes', 300]],
    ],
    [
      'If not freezing the cake, heat the oven to 180C/160C fan/gas 4 and bake for 35-45 mins.',
      'en',
      [['35-45 mins', 2100]],
    ],
    [
      'Transfer the bowl to the refrigerator for at least 1 hour and up to 24 hours.',
      'en',
      [
        ['1 hour', 3600],
        ['24 hours', 86400],
      ],
    ],
    [
      'They taste best when reheated in the microwave for 10 seconds.',
      'en',
      [['10 seconds', 10]],
    ],
  ])('finds the times in %j', (text, language, found) => {
    expect(times(text, language)).toEqual(found)
  })

  // Notation tests: hours and minutes together, and fractions.
  it.each<[string, Language, Array<[string, number]>]>([
    ['Slow cook 1 hr 45 min', 'en', [['1 hr 45 min', 6300]]],
    ['Cook for 1 1/2 minutes.', 'en', [['1 1/2 minutes', 90]]],
    ['Hauduta 1 ½ tuntia.', 'fi', [['1 ½ tuntia', 5400]]],
    [
      'Hauduta 1 tunti ja 15 minuuttia.',
      'fi',
      [['1 tunti ja 15 minuuttia', 4500]],
    ],
    ['Anna jäähtyä 30 minuutiksi.', 'fi', [['30 minuutiksi', 1800]]],
  ])('finds the times in %j', (text, language, found) => {
    expect(times(text, language)).toEqual(found)
  })

  it('keeps the text around the times', () => {
    expect(splitTimes('Bake for 20 min, then cool.', 'en')).toEqual([
      'Bake for ',
      { text: '20 min', seconds: 1200 },
      ', then cool.',
    ])
  })

  // Temperatures and sizes aren't times, and neither is a word that only
  // starts like a unit.
  it.each<[string, Language]>([
    ['Painele taikina ohueksi (1- 1 ½ cm) levyksi.', 'fi'],
    ['Heat the oven to 200C/180C fan/gas 6.', 'en'],
    ['Add 2 heaped tablespoons of flour.', 'en'],
    ['Lisää 2 sipulia.', 'fi'],
  ])('finds no time in %j', (text, language) => {
    expect(times(text, language)).toEqual([])
  })

  it("reads only the recipe's language's words", () => {
    expect(times('Paista 30 minuuttia.', 'en')).toEqual([])
    expect(times('Bake for 2 hours.', 'fi')).toEqual([])
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [4.2, '0:05'],
    [245, '4:05'],
    [3750, '1:02:30'],
    [-3, '0:00'],
  ])('shows %d seconds as %s', (seconds, clock) => {
    expect(formatClock(seconds)).toBe(clock)
  })
})

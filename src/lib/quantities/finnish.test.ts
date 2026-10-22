import { describe, expect, it } from 'vitest'
import {
  abbreviationEnding,
  caseOfEnding,
  inflect,
} from '@/lib/quantities/finnish'
import type { Case, FinnishWord } from '@/lib/quantities/finnish'

// Notation tests: the case forms of unit words. Corpus lines that use them
// are in steps.test.ts and present.test.ts.

const KUPPI: FinnishWord = ['kuppi', 'kupin', 'kuppia']
const DESI: FinnishWord = ['desi', 'desin', 'desiä']
const DESILITRA: FinnishWord = ['desilitra', 'desilitran', 'desilitraa']
const SENTTIMETRI: FinnishWord = ['senttimetri', 'senttimetrin', 'senttimetriä']
const TEELUSIKALLINEN: FinnishWord = [
  'teelusikallinen',
  'teelusikallisen',
  'teelusikallista',
]

describe('inflect', () => {
  it.each([
    [KUPPI, 'inessive', 'kupissa'],
    [KUPPI, 'illative', 'kuppiin'],
    [KUPPI, 'translative', 'kupiksi'],
    [DESI, 'inessive', 'desissä'],
    [DESI, 'adessive', 'desillä'],
    [DESILITRA, 'elative', 'desilitrasta'],
    [DESILITRA, 'illative', 'desilitraan'],
    [SENTTIMETRI, 'allative', 'senttimetrille'],
    [TEELUSIKALLINEN, 'adessive', 'teelusikallisella'],
    [TEELUSIKALLINEN, 'illative', 'teelusikalliseen'],
  ] as const)('%j %s → %s', (word, form, expected) => {
    expect(inflect(word, form)).toBe(expected)
  })
})

describe('abbreviationEnding', () => {
  it.each([
    [DESILITRA, 'inessive', 'ssa'],
    [SENTTIMETRI, 'inessive', 'ssä'],
    [DESILITRA, 'genitive', 'n'],
    [DESILITRA, 'illative', 'aan'],
    [SENTTIMETRI, 'illative', 'iin'],
    [TEELUSIKALLINEN, 'illative', 'een'],
    [DESILITRA, 'partitive', ''],
  ] as const)('%j %s → %s', (word, form, expected) => {
    expect(abbreviationEnding(word, form)).toBe(expected)
  })
})

describe('caseOfEnding', () => {
  it.each([
    ['n', 'genitive'],
    ['ssa', 'inessive'],
    ['ssä', 'inessive'],
    ['lla', 'adessive'],
    ['aan', 'illative'],
    ['een', 'illative'],
    ['ksi', 'translative'],
    ['aa', null],
  ] as const)('%s → %s', (ending, expected: Case | null) => {
    expect(caseOfEnding(ending)).toBe(expected)
  })
})

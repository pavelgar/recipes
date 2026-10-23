import { describe, expect, it } from 'vitest'
import { sameWord, splitWords } from '@/lib/words'
import { assertLedger } from '@/test/ledger'
import { KNOWN_MISSES, answerKey, corpusWords, mergeLedger } from '@/test/words'

describe('splitWords', () => {
  it.each([
    ['fi', '250 g Valio maitorahkaa', ['valio', 'maitorahkaa']],
    ['fi', 'Ananas-rahkajuoma', ['ananas', 'rahkajuoma']],
    ['fi', '1 tlk creme fraichea', ['tlk', 'creme', 'fraichea']],
    ['en', '½ tbsp crème fraîche', ['tbsp', 'creme', 'fraiche']],
    [
      'en',
      '1 jalapeño, seeded and finely diced',
      ['jalapeno', 'seeded', 'and', 'finely', 'diced'],
    ],
    ['en', 'Valentine’s Day', ['valentines', 'day']],
  ] as const)('%s %j', (language, text, words) => {
    expect(splitWords(text, language)).toEqual(words)
  })

  it('keeps å, ä and ö in Finnish only', () => {
    expect(splitWords('pähkinää', 'fi')).toEqual(['pähkinää'])
    expect(splitWords('pähkinää', 'en')).toEqual(['pahkinaa'])
  })
})

// Notation tests with corpus forms. The answer key below covers every word
// with several forms in the corpus.
describe('sameWord', () => {
  it.each([
    ['peruna', 'perunoita'],
    ['mansikka', 'mansikoita'],
    ['leipä', 'leipiä'],
    ['papuja', 'pavut'],
    ['vaniljatanko', 'vaniljatangon'],
    ['keltainen', 'keltaisia'],
    ['gluteeniton', 'gluteenittomia'],
    ['kasvis', 'kasvikset'],
    ['valkosipulinkynsi', 'valkosipulinkynttä'],
    ['jälkiruoka', 'jälkiruoat'],
    ['jälkiruoka', 'jälkiruuat'],
  ])('fi: %s ~ %s', (a, b) => {
    expect(sameWord(a, b, 'fi')).toBe(true)
  })

  it.each([
    ['kana', 'kaneli'],
    ['purjo', 'purkki'],
    ['mustia', 'mustikoita'],
    ['omena', 'omaa'],
    ['makea', 'maun'],
  ])('fi: %s ≁ %s', (a, b) => {
    expect(sameWord(a, b, 'fi')).toBe(false)
  })

  it.each([
    ['leaf', 'leaves'],
    ['dry', 'dried'],
    ['fry', 'fries'],
    ['make', 'made'],
    ['pie', 'pies'],
    ['constructor', 'constructors'],
  ])('en: %s ~ %s', (a, b) => {
    expect(sameWord(a, b, 'en')).toBe(true)
  })

  it('compares words by one language only', () => {
    // Finnish rules read "rice" and "ricotta" ("rico-tta") as one word.
    expect(sameWord('rice', 'ricotta', 'fi')).toBe(true)
    expect(sameWord('rice', 'ricotta', 'en')).toBe(false)
  })
})

describe.each(['fi', 'en'] as const)('the %s answer key', (language) => {
  const words = answerKey(language)

  it('lists forms the corpus writes, each under one word', () => {
    const corpus = corpusWords(language)
    const forms = words.flat()
    expect(forms.filter((form) => !corpus.has(form))).toEqual([])
    expect(forms.filter((form, i) => forms.indexOf(form) !== i)).toEqual([])
  })

  it('has every form of a word match the others', () => {
    const misses = words
      .filter(
        (forms) =>
          !forms.every((a) => forms.every((b) => sameWord(a, b, language))),
      )
      .map((forms) => forms.join(' '))
    expect(misses).toEqual(KNOWN_MISSES[language])
  })
})

describe('different words', () => {
  it('keep their ledger of shared keys', () => {
    const path = 'src/lib/words/__ledger__/merges.txt'
    assertLedger(mergeLedger(path), path, (message) => expect.fail(message))
  })
})

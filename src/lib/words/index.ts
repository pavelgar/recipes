// Word handling for search and tags: splits text into words and gives each
// word keys, so that forms of one word ("peruna", "perunaa", "perunoita";
// "leaf", "leaves") match. Each language has its own rules, and words are
// only compared within a language.

import { englishKeys } from '@/lib/words/english'
import { finnishKeys } from '@/lib/words/finnish'
import type { Language } from '@/lib/quantities/numbers'

export { foldText, splitWords } from '@/lib/words/text'

// The keys of a word from splitWords. Two forms are of one word when any of
// their keys are the same.
export function wordKeys(word: string, language: Language): Array<string> {
  return language === 'fi' ? finnishKeys(word) : englishKeys(word)
}

// Whether two words from splitWords may be forms of one word.
export function sameWord(a: string, b: string, language: Language): boolean {
  if (a === b) return true
  const keys = new Set(wordKeys(a, language))
  return wordKeys(b, language).some((k) => keys.has(k))
}

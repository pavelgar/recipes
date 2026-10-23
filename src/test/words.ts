import { readFileSync } from 'node:fs'
import { splitWords, wordKeys } from '@/lib/words'
import { corpusRecipes } from '@/test/corpus'
import { checkLedger } from '@/test/ledger'
import type { LedgerCheck } from '@/test/ledger'
import type { Language } from '@/lib/quantities/numbers'

// The answer key of src/lib/words/__words__/: for each word with more than
// one form in the corpus recipes' titles and ingredient lines, the forms
// written there, one word per line. Forms are written as splitWords gives
// them, without accents: "fraiche", "jalapenos".
export function answerKey(language: Language): Array<Array<string>> {
  return readFileSync(`src/lib/words/__words__/${language}.txt`, 'utf8')
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) =>
      line.split(' ').flatMap((form) => splitWords(form, language)),
    )
}

// Words of the answer key whose forms the keys don't all bring together:
// irregular forms ("maku", "maun") and words too short to cut ("muu",
// "muita").
export const KNOWN_MISSES: Record<Language, ReadonlyArray<string>> = {
  fi: ['maku maun', 'muita muu'],
  en: [],
}

// Every word in the corpus recipes' titles and ingredient lines.
export function corpusWords(language: Language): Set<string> {
  return new Set(
    corpusRecipes
      .filter((recipe) => recipe.language === language)
      .flatMap((recipe) => [recipe.title, ...recipe.ingredients])
      .flatMap((text) => splitWords(text, language)),
  )
}

// Different words of the corpus that share a key, so a search for one finds
// the other. A word is a line of the answer key, or a form that isn't in
// it. One entry per pair of words, with the keys they share.
export function mergeLedger(path: string): LedgerCheck {
  const items = (['fi', 'en'] as const).flatMap((language) => {
    const words = new Map<string, string>()
    for (const forms of answerKey(language)) {
      for (const form of forms) words.set(form, forms.join(' '))
    }
    const byKey = new Map<string, Set<string>>()
    for (const form of corpusWords(language)) {
      for (const key of wordKeys(form, language)) {
        const word = words.get(form) ?? form
        byKey.set(key, (byKey.get(key) ?? new Set()).add(word))
      }
    }
    const shared = new Map<string, Array<string>>()
    for (const [key, set] of byKey) {
      const list = [...set].sort()
      list.forEach((a, i) => {
        for (const b of list.slice(i + 1)) {
          const pair = `${a} ~ ${b}`
          shared.set(pair, [...(shared.get(pair) ?? []), key])
        }
      })
    }
    return [...shared]
      .sort(([a], [b]) => a.localeCompare(b, language))
      .map(([pair, keys]) => ({
        group: language,
        text: pair,
        reading: [`shared ${keys.sort().join(' ')}`],
      }))
  })
  return checkLedger({
    path,
    title: [
      'Different words of the development corpus that share a key, so a',
      'search for one finds the other. A word is a line of',
      'src/lib/words/__words__/, or a form not in it.',
      '✓: finding one from the other is fine, as for "salt" and "salted".',
      '✗ (want: apart): they should stay apart.',
      'Written by the tests; see src/test/ledger.ts for how to update it.',
    ],
    items,
    summarise: (_, entries) => `: ${entries.length} pairs`,
  })
}

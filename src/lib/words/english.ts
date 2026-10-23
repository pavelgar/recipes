import { stemmer } from '@orama/stemmers/english'

// Irregular forms the stemmer doesn't bring back to their word.
const IRREGULAR = new Map([
  ['calves', 'calf'],
  ['halves', 'half'],
  ['knives', 'knife'],
  ['leaves', 'leaf'],
  ['loaves', 'loaf'],
  ['made', 'make'],
  ['pies', 'pie'],
])

// The key of a lowercase English word: its stem from @orama/stemmers'
// English (Snowball) stemmer, with a final i spelled y, since the stemmer
// leaves "dry" but cuts "dried" to "dri".
export function englishKeys(word: string): Array<string> {
  return [stemmer(IRREGULAR.get(word) ?? word).replace(/i$/, 'y')]
}

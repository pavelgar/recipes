import stem from 'wink-porter2-stemmer'

// Irregular forms the stemmer doesn't bring back to their word.
const IRREGULAR = new Map([
  ['calves', 'calf'],
  ['halves', 'half'],
  ['knives', 'knife'],
  ['leaves', 'leaf'],
  ['loaves', 'loaf'],
  ['made', 'make'],
])

// The key of a lowercase English word: its stem by Snowball's English
// algorithm (Porter2), from wink-porter2-stemmer, with a final i spelled y,
// as in "dry" and "dried". Words of two letters are their own key, so "bi"
// (as in "bi-carb") isn't "by".
export function englishKeys(word: string): Array<string> {
  if (word.length < 3) return [word]
  return [stem(IRREGULAR.get(word) ?? word).replace(/i$/, 'y')]
}

import { uniq } from 'es-toolkit'

// Keys for Finnish words, so that a search for one form of a word finds the
// others. Finnish adds endings to a word's stem, and the stem changes too:
// "mansikka", "mansikoita"; "leipä", "leivät"; "keltainen", "keltaisia". A
// key is a form cut back to what the forms of its word share.
//
// Without a dictionary, an ending can't always be told from the end of a
// word: "peruna" is a word, but "palana" is "pala" with the ending -na. So a
// form gets a key for each way it can be read, and two forms match when any
// of their keys do.
//
// Snowball's Finnish stemmer from @orama/stemmers was the first choice, but
// it found every form of only 142 of the 221 words in
// src/lib/words/__words__/fi.txt: it cuts "peruna" to "peru" and "perunaa"
// to "perun".

const VOWELS = 'aeiouyäö'

const isVowel = (c: string | undefined) => c !== undefined && VOWELS.includes(c)

// Case endings, singular and plural, after the stem: "porkkana-a",
// "porkkano-ita", "kuori-neen", "mansika-t".
const ENDINGS: ReadonlyArray<string> = [
  // Plural, with its i or j.
  'ia',
  'iä',
  'ita',
  'itä',
  'ja',
  'jä',
  'ien',
  'iden',
  'itten',
  'jen',
  'issa',
  'issä',
  'ista',
  'istä',
  'ihin',
  'illa',
  'illä',
  'ilta',
  'iltä',
  'ille',
  'ina',
  'inä',
  'iksi',
  'ineen',
  // Singular, and the t of the plural.
  'a',
  'ä',
  'ta',
  'tä',
  'tta',
  'ttä',
  'n',
  'ssa',
  'ssä',
  'sta',
  'stä',
  'seen',
  'lla',
  'llä',
  'lta',
  'ltä',
  'lle',
  'na',
  'nä',
  'ksi',
  't',
]

// Vowel pairs that are one syllable even though their second vowel isn't
// i, u or y.
const DIPHTHONGS = new Set(['ie', 'uo', 'yö'])

// Consonants that alternate between the forms of a word (consonant
// gradation), and the one spelling the key uses: "kirsikka", "kirsikoita";
// "vaniljatanko", "vaniljatangon"; "kynsi", "kynttä", "kynnet".
const GRADES: ReadonlyArray<readonly [string, string]> = [
  ['kk', 'k'],
  ['pp', 'p'],
  ['tt', 't'],
  ['ng', 'nk'],
  ['mm', 'mp'],
  ['ll', 'lt'],
  ['nn', 'nt'],
  ['rr', 'rt'],
  ['ns', 'nt'],
  ['rs', 'rt'],
]

// The stems a form can have: the form itself, read as a word without an
// ending, and the form without each ending it may have.
function stems(form: string): Set<string> {
  const all = new Set([form])
  const cut: Array<string> = []
  for (const ending of ENDINGS) {
    if (!form.endsWith(ending)) continue
    const stem = form.slice(0, -ending.length)
    if (stem.length < 3 || ![...stem].some(isVowel)) continue
    all.add(stem)
    cut.push(stem)
  }
  // Words whose other forms have a longer stem: "keltainen", "keltaise-";
  // "gluteeniton", "gluteenittoma-"; "kasvis", "kasvikse-".
  for (const stem of [...all]) {
    if (stem.length > 5 && stem.endsWith('nen')) {
      all.add(`${stem.slice(0, -3)}s`)
    } else if (/t[oö]n$/.test(stem)) {
      all.add(`${stem.slice(0, -2)}t${stem.at(-2)}m`)
    } else if (/[aeiouyäö]s$/.test(stem)) {
      all.add(`${stem.slice(0, -1)}ks`)
    }
  }
  // A k that gradation drops before an ending: "pääruoa-t", "sia-n". Ruoka
  // also has "ruua-t".
  for (const stem of cut) {
    const [a, b] = stem.slice(-2)
    if (stem.endsWith('uua')) all.add(`${stem.slice(0, -3)}uoka`)
    if (
      isVowel(a) &&
      isVowel(b) &&
      a !== b &&
      !'iuy'.includes(b) &&
      !DIPHTHONGS.has(a + b)
    ) {
      all.add(`${stem.slice(0, -1)}k${b}`)
    }
  }
  return all
}

// A stem cut back to what its word's forms share: without its last vowel,
// or both letters of a long one, and with the consonants before that
// spelled one way. "porkkano" and "porkkana" both become "porkkan".
function key(stem: string): string {
  let s = stem
  const last = s.at(-1)
  if (isVowel(last) && s.length > 3) {
    s = s.slice(0, -1)
    if (s.at(-1) === last && s.length > 3) s = s.slice(0, -1)
  }
  // Weak d and v after a vowel: "naudan", "pavut"; and "lehdet".
  if (/.[aeiouyäöh]d$/.test(s)) return `${s.slice(0, -1)}t`
  if (/.[aeiouyäö]v$/.test(s)) return `${s.slice(0, -1)}p`
  for (const [from, to] of GRADES) {
    if (s.length > from.length + 1 && s.endsWith(from)) {
      return s.slice(0, -from.length) + to
    }
  }
  return s
}

// The keys of a lowercase Finnish word.
export function finnishKeys(word: string): Array<string> {
  if (word.length < 3) return [word]
  return uniq([...stems(word)].map(key))
}

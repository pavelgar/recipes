// Finnish case forms of unit words, made from three forms of each: the
// nominative, genitive and partitive singular ("kuppi", "kupin", "kuppia").

export type FinnishWord = readonly [
  nominative: string,
  genitive: string,
  partitive: string,
]

// The cases an amount is written in. The nominative and partitive follow
// the number: "1 kuppi", "2 kuppia". The others stay the same for every
// number: "1 kupissa", "2 kupissa", "1,5 litran vuoka".
export type Case =
  | 'nominative'
  | 'partitive'
  | 'genitive'
  | 'inessive'
  | 'elative'
  | 'illative'
  | 'adessive'
  | 'ablative'
  | 'allative'
  | 'translative'

// The cases a measure takes in a step besides the three it is given in:
// "6 desissä vettä", "2 desilitraan", "1 teelusikallisella", "kunnes
// nestettä on 2 desilitraksi".
export const MEASURE_CASES: ReadonlyArray<Case> = [
  'inessive',
  'elative',
  'illative',
  'adessive',
  'ablative',
  'allative',
  'translative',
]

// Endings after the stem of the genitive, with back and front vowels:
// "kupi-ssa", "tölki-ssä".
const ENDINGS: Partial<Record<Case, readonly [back: string, front: string]>> = {
  inessive: ['ssa', 'ssä'],
  elative: ['sta', 'stä'],
  adessive: ['lla', 'llä'],
  ablative: ['lta', 'ltä'],
  allative: ['lle', 'lle'],
  translative: ['ksi', 'ksi'],
}

// Whether a word takes endings with ä: its last vowel other than e or i
// decides, and a word with only e and i takes them too. "tölkissä",
// "desissä", "senttimetrissä", but "kupissa" and "desilitrassa".
function takesFront(word: string): boolean {
  const vowels = word.toLowerCase().match(/[aouäöy]/g)
  return vowels === null || 'äöy'.includes(vowels[vowels.length - 1])
}

// "kuppiin", "litraan", "kiloon": the last vowel again and n. Words ending
// in a consonant take the genitive's stem and -en: "teelusikalliseen".
function illative([nominative, genitive]: FinnishWord): string {
  const last = nominative[nominative.length - 1]
  return /[aeiouyäö]/.test(last)
    ? `${nominative}${last}n`
    : `${genitive.slice(0, -1)}en`
}

export function inflect(word: FinnishWord, form: Case): string {
  const [nominative, genitive, partitive] = word
  switch (form) {
    case 'nominative':
      return nominative
    case 'partitive':
      return partitive
    case 'genitive':
      return genitive
    case 'illative':
      return illative(word)
    default: {
      const [back, front] = ENDINGS[form] ?? ['', '']
      return genitive.slice(0, -1) + (takesFront(nominative) ? front : back)
    }
  }
}

// The ending an abbreviation takes after a colon, as it is read aloud:
// "dl:ssa" (desilitrassa), "cm:ssä" (senttimetrissä), "tl:een"
// (teelusikalliseen), "dl:n".
export function abbreviationEnding(spoken: FinnishWord, form: Case): string {
  switch (form) {
    case 'nominative':
    case 'partitive':
      return ''
    case 'genitive':
      return 'n'
    case 'illative': {
      const ending = illative(spoken).slice(-3)
      return /^[aeiouyäö]{2}n$/.test(ending) ? ending : 'een'
    }
    default: {
      const [back, front] = ENDINGS[form] ?? ['', '']
      return takesFront(spoken[0]) ? front : back
    }
  }
}

// The case of an ending written after an abbreviation's colon: ":n",
// ":ssa", ":aan". Null for an ending that isn't one of these.
export function caseOfEnding(ending: string): Case | null {
  const lower = ending.toLowerCase()
  if (lower === 'n') return 'genitive'
  if (/^(?:[aeiouyäö]{2}n|hin)$/.test(lower)) return 'illative'
  for (const [form, endings] of Object.entries(ENDINGS)) {
    if (endings.includes(lower)) return form as Case
  }
  return null
}

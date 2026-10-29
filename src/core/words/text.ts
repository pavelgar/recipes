import type { Language } from '@/core/quantities/numbers'

// Finnish letters that look like accented ones but are letters of their
// own: "säilyke" is not "sailyke".
const FINNISH_LETTERS = new Set(['å', 'ä', 'ö'])

// Text as its words are compared: lowercase, without accents, so
// "Jalapeño" and "jalapeno" are one word, and without apostrophes inside a
// word, so "valentine’s" is "valentines". Finnish keeps å, ä and ö.
export function foldText(text: string, language: Language): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{ASCII}]/gu, (c) =>
      language === 'fi' && FINNISH_LETTERS.has(c)
        ? c
        : c.normalize('NFD').replace(/\p{M}+/gu, ''),
    )
    .replace(/(?<=\p{L})['’ʼ](?=\p{L})/gu, '')
}

// The words of a text, for search: runs of two or more letters. Anything
// else separates words, so "Ananas-rahkajuoma" is two words and the
// numbers and units of an ingredient line are left out.
export function splitWords(text: string, language: Language): Array<string> {
  return foldText(text, language).match(/\p{L}{2,}/gu) ?? []
}

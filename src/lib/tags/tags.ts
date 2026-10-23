import { foldText, wordKeys } from '@/lib/words'
import type { Language } from '@/lib/quantities/numbers'

const LANGUAGES: ReadonlyArray<Language> = ['fi', 'en']

// A tag and the languages of the recipes that have it. Tags have no
// language of their own, so it is read by the rules of these; a tag on no
// recipe may be in any language.
export type Tag = {
  readonly name: string
  readonly languages: ReadonlyArray<Language>
}

// A tag's name as stored: lowercase, with spaces trimmed and collapsed.
export function normaliseTag(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

// A tag read in one language: its words, numbers included ("1 of
// 5-a-day"), their keys, and all of it run together, so spacing and
// punctuation don't count ("tray bake", "traybake"; "#välipala").
type Reading = {
  readonly words: ReadonlyArray<string>
  readonly keys: ReadonlyArray<ReadonlySet<string>>
  readonly joined: string
  readonly joinedKeys: ReadonlySet<string>
}

function read(tag: string, language: Language): Reading {
  const words = foldText(tag, language).match(/[\p{L}\p{N}]+/gu) ?? []
  const joined = words.join('')
  return {
    words,
    keys: words.map((word) => new Set(wordKeys(word, language))),
    joined,
    joinedKeys: new Set(wordKeys(joined, language)),
  }
}

const meet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  [...a].some((key) => b.has(key))

function same(a: Reading, b: Reading): boolean {
  if (a.joined === '' || b.joined === '') return false
  if (a.joined === b.joined) return true
  // Word by word, since in Finnish each word takes the plural:
  // "suolainen leivonnainen", "suolaiset leivonnaiset".
  if (
    a.words.length === b.words.length &&
    a.keys.every((keys, i) => meet(keys, b.keys[i]))
  ) {
    return true
  }
  // Run together, for a word written in two: "tray bake", "traybakes".
  return meet(a.joinedKeys, b.joinedKeys)
}

// Whether two tags may be one tag written differently, read by the rules of
// any of the languages: in letter case, spacing or punctuation ("Traybake",
// "tray bake"), or in number ("pasta", "pastas"; "jälkiruoka",
// "jälkiruoat"). Other forms of a word count too ("välipala", "välipalaa"),
// as do some English words made from one ("bake", "baking"), since search
// treats them as one word.
export function sameTag(
  a: string,
  b: string,
  languages: ReadonlyArray<Language> = LANGUAGES,
): boolean {
  return languages.some((language) =>
    same(read(a, language), read(b, language)),
  )
}

// Every pair of tags that may be one tag, in the order of the list, for
// someone to review. Nothing is merged. Two tags are compared in the
// languages they share, so tags in different languages never are: "pork"
// on English recipes and "porkkana" on Finnish ones.
export function possibleDuplicates(
  tags: ReadonlyArray<Tag>,
): Array<readonly [string, string]> {
  const readings = tags.map(
    (tag) =>
      new Map(
        (tag.languages.length > 0 ? tag.languages : LANGUAGES).map(
          (language) => [language, read(tag.name, language)],
        ),
      ),
  )
  const pairs: Array<readonly [string, string]> = []
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const other = readings[j]
      if (
        [...readings[i]].some(([language, reading]) => {
          const theirs = other.get(language)
          return theirs !== undefined && same(reading, theirs)
        })
      ) {
        pairs.push([tags[i].name, tags[j].name])
      }
    }
  }
  return pairs
}

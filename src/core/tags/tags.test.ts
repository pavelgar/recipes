import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normaliseTag, possibleDuplicates, sameTag } from '@/core/tags'
import { corpusTags } from '@/testing/corpus'
import { assertLedger, checkLedger } from '@/testing/ledger'
import type { Language } from '@/core/quantities/numbers'

describe('normaliseTag', () => {
  it.each([
    ['Jälkiruoat', 'jälkiruoat'],
    [
      'Banaanismoothie maapähkinävoin kera ',
      'banaanismoothie maapähkinävoin kera',
    ],
    ['Side Dishes', 'side dishes'],
  ])('%j → %j', (name, tag) => {
    expect(normaliseTag(name)).toBe(tag)
  })
})

// Notation tests with corpus tags. The answer key below covers every
// duplicate in the corpus.
describe('sameTag', () => {
  it.each([
    ['pääruoka', 'pääruoat'],
    ['#välipala', 'välipalat'],
    ['suolainen leivonnainen', 'suolaiset leivonnaiset'],
    ['tray bake', 'traybake'],
    ['egg white', 'egg whites'],
    ['valentine’s day', 'valentines day'],
  ])('%j ~ %j', (a, b) => {
    expect(sameTag(a, b)).toBe(true)
  })

  it.each([
    ['1 of 5-a-day', '2 of 5-a-day'],
    ['30 min', '30 minuuttia'],
    ['piiras', 'piirakka'],
    ['leivonnaiset', 'suolaiset leivonnaiset'],
  ])('%j ≁ %j', (a, b) => {
    expect(sameTag(a, b)).toBe(false)
  })

  it('checks constructor tags for duplicates', () => {
    expect(sameTag('constructor', 'constructors')).toBe(true)
    expect(
      possibleDuplicates(['constructor', 'dessert', 'constructors']),
    ).toEqual([['constructor', 'constructors']])
  })
})

describe('possibleDuplicates', () => {
  // Tags from the corpus: "pizza" from an English site, "pizzat" from a
  // Finnish one.
  it('reads every tag by the rules of both languages', () => {
    expect(
      possibleDuplicates(['jälkiruoka', 'pizza', 'desserts', 'pizzat']),
    ).toEqual([['pizza', 'pizzat']])
  })
})

// Every corpus tag.
const tags = [...new Set(corpusTags.map((tag) => normaliseTag(tag.text)))]

// src/core/tags/__tags__/duplicates.txt: one tag per line, its forms
// separated by " | ", under a heading for the language they are read in
// ("## fi"). Other lines starting with "# " are comments.
const duplicates = readFileSync('src/core/tags/__tags__/duplicates.txt', 'utf8')
  .split('\n')
  .reduce<Array<{ language: Language; forms: Array<string> }>>((all, line) => {
    const heading = /^## (fi|en)$/.exec(line)
    if (heading) all.push({ language: heading[1] as Language, forms: [] })
    else if (line !== '' && !/^# /.test(line)) {
      all.push({
        language: all[all.length - 1].language,
        forms: line.split(' | '),
      })
    }
    return all
  }, [])
  .filter((group) => group.forms.length > 0)

describe('the tag answer key', () => {
  it('lists tags of the corpus', () => {
    const names = new Set(tags)
    const forms = duplicates.flatMap((group) => group.forms)
    expect(forms.filter((tag) => !names.has(tag))).toEqual([])
  })

  it('has every pair of a tag’s forms flagged', () => {
    const missed = duplicates.flatMap(({ language, forms }) =>
      forms.flatMap((a, i) =>
        forms
          .slice(i + 1)
          .filter((b) => !sameTag(a, b, [language]))
          .map((b) => `${a} ~ ${b}`),
      ),
    )
    expect(missed).toEqual([])
  })

  it('keeps the ledger of other flagged pairs', () => {
    const path = 'src/core/tags/__ledger__/flags.txt'
    const listed = new Map(
      duplicates.flatMap(({ forms }, i) => forms.map((tag) => [tag, i])),
    )
    const items = possibleDuplicates(tags)
      .filter(
        ([a, b]) =>
          listed.get(a) === undefined || listed.get(a) !== listed.get(b),
      )
      .map((pair) => [...pair].sort().join(' ~ '))
      .sort()
      .map((text) => ({ group: 'corpus', text, reading: ['flagged'] }))
    const check = checkLedger({
      path,
      title: [
        'Pairs of corpus tags that possibleDuplicates flags, other than those',
        'in src/core/tags/__tags__/duplicates.txt.',
        '✓: flagging them is fine. ✗ (want: apart): they should not be flagged.',
        'Written by the tests; see src/testing/ledger.ts for how to update it.',
      ],
      items,
      summarise: (_, entries) =>
        `: ${tags.length} tags, ${entries.length} other pairs flagged`,
    })
    assertLedger(check, path, (message) => expect.fail(message))
  })
})

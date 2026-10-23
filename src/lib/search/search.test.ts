import { describe, expect, it } from 'vitest'
import { createRecipeSearch } from '@/lib/search'
import { sameWord, splitWords } from '@/lib/words'
import { corpusRecipes } from '@/test/corpus'
import { KNOWN_MISSES, answerKey } from '@/test/words'
import type { CorpusRecipe } from '@/test/corpus'

// Searches over the development corpus's recipes, for the word forms they
// write.

const recipes = new Map<string, CorpusRecipe>(
  corpusRecipes.map((recipe) => [recipe.url, recipe]),
)
const { search } = createRecipeSearch(
  [...recipes.values()].map((recipe) => ({ ...recipe, id: recipe.url })),
)

const wordsOf = new Map(
  [...recipes.values()].map((recipe) => [
    recipe.url,
    splitWords(
      [recipe.title, ...recipe.ingredients].join('\n'),
      recipe.language,
    ),
  ]),
)

// Whether a recipe has the word in some form, by its language's rules.
const has = (url: string, word: string) => {
  const language = recipes.get(url)?.language ?? 'fi'
  return (wordsOf.get(url) ?? []).some((w) => sameWord(word, w, language))
}

describe.each(['fi', 'en'] as const)('searching %s word forms', (language) => {
  it('finds every recipe that writes any form of the word', () => {
    const misses: Array<string> = []
    for (const forms of answerKey(language)) {
      if (KNOWN_MISSES[language].includes(forms.join(' '))) continue
      const want = [...recipes.values()]
        .filter(
          (recipe) =>
            recipe.language === language &&
            forms.some((form) => wordsOf.get(recipe.url)?.includes(form)),
        )
        .map((recipe) => recipe.url)
      for (const form of forms) {
        const found = new Set(search(`${form} `))
        const missing = want.filter((url) => !found.has(url))
        if (missing.length > 0) {
          misses.push(`${form}: ${missing.length} of ${want.length}`)
        }
      }
    }
    expect(misses).toEqual([])
  })

  // The title boost may still put another form first: "sitruunaa" finds
  // "Sitruuna-valkosuklaakakku" first. While a word is being typed, the
  // longer words it starts can add up past the exact form, so only
  // complete words are checked.
  it('ranks the form searched for above other forms, but for titles', () => {
    const misplaced: Array<string> = []
    for (const form of answerKey(language).flat()) {
      const found = search(`${form} `).filter(
        (url) => recipes.get(url)?.language === language,
      )
      const exact = found.map((url) => !!wordsOf.get(url)?.includes(form))
      found.slice(0, exact.lastIndexOf(true)).forEach((url, i) => {
        const title = splitWords(recipes.get(url)?.title ?? '', language)
        if (
          !exact[i] &&
          !title.some((word) => sameWord(word, form, language))
        ) {
          misplaced.push(`${form}: ${url}`)
        }
      })
    }
    expect(misplaced).toEqual([])
  })

  it('finds only recipes with the word, read in their own language', () => {
    for (const form of answerKey(language).flat()) {
      for (const url of search(`${form} `)) {
        expect(has(url, form), `${form}: ${url}`).toBe(true)
      }
    }
  })
})

describe('searching titles', () => {
  it('finds each recipe by its title, among recipes with all its words', () => {
    for (const recipe of recipes.values()) {
      if (recipe.title === '') continue
      const found = search(`${recipe.title} `)
      expect(found, recipe.title).toContain(recipe.url)
      const words = splitWords(recipe.title, recipe.language)
      for (const url of found) {
        if (recipes.get(url)?.language !== recipe.language) continue
        const missing = words
          .filter((word) => !['ja', 'tai', 'and', 'or', 'with'].includes(word))
          .filter((word) => !has(url, word))
        expect(missing, `${recipe.title}: ${url}`).toEqual([])
      }
    }
  })
})

describe('search', () => {
  it('reads an unfinished last word as the start of a word', () => {
    const found = search('hasselpäh')
    expect(found.length).toBeGreaterThan(0)
    for (const url of found) {
      const words = wordsOf.get(url) ?? []
      expect(words.some((word) => word.startsWith('hasselpäh'))).toBe(true)
    }
    expect(search('hasselpäh ')).toEqual([])
  })

  it.each([
    ['en', 'baking', ['bak', 'baki', 'bakin']],
    ['en', 'leaves', ['lea', 'leav', 'leave']],
    ['fi', 'jauhelihaa', ['ja', 'jau']],
    ['fi', 'taikinaa', ['ta', 'tai', 'taik']],
    ['en', 'orange', ['or', 'ora']],
  ] as const)(
    'finds %s %s throughout its prefixes',
    (language, word, prefixes) => {
      const want = [...recipes.values()]
        .filter(
          (recipe) =>
            recipe.language === language &&
            wordsOf.get(recipe.url)?.includes(word),
        )
        .map((recipe) => recipe.url)
      expect(want.length).toBeGreaterThan(0)
      for (const prefix of prefixes) {
        const found = new Set(search(prefix))
        expect(
          want.filter((url) => !found.has(url)),
          prefix,
        ).toEqual([])
      }
    },
  )

  it('keeps prefix matching on the final word when it is a joining word', () => {
    expect(search('hasselpäh ja')).toEqual([])
  })

  it('leaves out the words that join others', () => {
    expect(search('kanaa ja sipulia ')).toEqual(search('kanaa sipulia '))
    expect(search('salt and pepper ')).toEqual(search('salt pepper '))
  })

  it('treats constructor as an ordinary search word', () => {
    expect(search('constructor')).toEqual([])
  })

  it('finds nothing for a query without words', () => {
    expect(search('')).toEqual([])
    expect(search('2 dl ')).not.toEqual([])
    expect(search('2 ')).toEqual([])
  })
})

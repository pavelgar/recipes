import MiniSearch from 'minisearch'
import { splitWords, wordKeys } from '@/lib/words'
import type { Query } from 'minisearch'
import type { Language } from '@/lib/quantities/numbers'

// Recipe search over titles and ingredient lines, run in the browser so it
// works offline too. Each recipe is searched in its own language: a query
// is read by each language's rules and matched only against recipes in
// that language.

export type SearchRecipe = {
  readonly id: string
  readonly language: Language
  readonly title: string
  readonly ingredients: ReadonlyArray<string>
}

export type RecipeSearch = {
  // The ids of the recipes that have every word of the query in some form,
  // best first. Unless the query ends with a space, its last word may be
  // unfinished and matches the start of a word too: "porkk" finds
  // "porkkanaa".
  readonly search: (query: string) => Array<string>
}

const LANGUAGES: ReadonlyArray<Language> = ['fi', 'en']

// Completed words a query can join others with, which recipes needn't
// contain. An unfinished one may be a prefix ("tai" in "taikinaa").
const JOINING: Record<Language, ReadonlySet<string>> = {
  fi: new Set(['ja', 'tai', 'sekä']),
  en: new Set(['and', 'or', 'with']),
}

// Each word as written, kept apart from word keys. Query words match it
// whole, so recipes with the form typed rank above other forms: "chops"
// above "chopped". An unfinished last word also matches the start of it,
// so prefixes match the spelling before stemming without changing which
// whole words match.
const formKey = (word: string) => `form:${word}`

// Each language has its own fields, so its keys only meet its recipes.
const fieldsOf = (language: Language) => [
  `title:${language}`,
  `ingredients:${language}`,
]

const languageOf = (field: string | undefined) =>
  field?.split(':')[1] as Language

export function createRecipeSearch(
  recipes: Iterable<SearchRecipe>,
): RecipeSearch {
  const index = new MiniSearch<SearchRecipe>({
    fields: LANGUAGES.flatMap(fieldsOf),
    extractField: (recipe, field) => {
      if (field === 'id') return recipe.id
      const [name, language] = field.split(':')
      if (language !== recipe.language) return ''
      return name === 'title' ? recipe.title : recipe.ingredients.join('\n')
    },
    tokenize: (text, field) => splitWords(text, languageOf(field)),
    processTerm: (word, field) => [
      ...wordKeys(word, languageOf(field)),
      formKey(word),
    ],
    // Queries are built from keys below, so they pass through as they are.
    searchOptions: {
      boost: { 'title:fi': 2, 'title:en': 2 },
      tokenize: (term) => [term],
      processTerm: (term) => term,
    },
  })
  index.addAll([...recipes])

  return {
    search(query) {
      const unfinished = !/\s$/.test(query)
      const tree: Query = {
        combineWith: 'OR',
        queries: LANGUAGES.map((language) => {
          const words = splitWords(query, language).filter(
            (word, i, all) =>
              (unfinished && i === all.length - 1) ||
              !JOINING[language].has(word),
          )
          return {
            combineWith: 'AND',
            fields: fieldsOf(language),
            queries: words.map((word, i) => ({
              combineWith: 'OR',
              queries: [
                ...wordKeys(word, language),
                formKey(word),
                ...(unfinished && i === words.length - 1
                  ? [{ queries: [formKey(word)], prefix: true }]
                  : []),
              ],
            })),
          }
        }),
      }
      return index.search(tree).map((result) => String(result.id))
    },
  }
}

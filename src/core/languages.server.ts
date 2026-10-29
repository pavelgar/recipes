import { francAll } from 'franc'
import {
  languageName,
  recipeLanguageOf,
  UNKNOWN_LANGUAGE,
} from '@/core/languages'
import type { RecipeLanguage } from '@/core/languages'

// Pure, but named .server so that the build keeps it out of the browser:
// franc's language data would grow the app's download (DESIGN.md,
// "Recipes").

// franc tells a text's language from the letter triples it uses. It knows
// some 190 languages, but needs text to go on. Its scores are relative, 1
// for its first choice.

// franc can't tell Scots from English: it scores Scots within a hundredth
// of English on almost every English recipe, and puts it first on some, so
// its Scots says nothing. Without it, its first choice was right for all
// 107 surveyed recipes and 301 of the corpus sample's 325 shorter texts
// (285 with it).
const IGNORED = ['sco']

// Below this many characters franc isn't trusted over what the page says:
// on the corpus sample's shorter texts (ingredient lines and the step
// sentences with amounts) its first choice was wrong for one recipe in
// eight, and the right language scored as low as 0.89.
const ENOUGH_TEXT = 500

// Text franc can suggest a language from: with less, its guesses at a
// recipe's start are noise ("Kaneliässät" alone reads as Swati); from about
// this much, the right language comes first.
const SUGGEST_FROM = 70

// A language said to be the recipe's, by its page or in the editor, stands
// while franc scores it this close to its first choice. kinuskikissa.fi
// says lang="en" on Finnish recipes, which franc scores 0.86 and 0.92;
// where franc's first choice was wrong on longer texts, the right language
// scored 0.989 or more.
const SAID_HOLDS = 0.95

// The languages franc finds in a text, most likely first, with its scores.
function identified(text: string): Array<[RecipeLanguage, number]> {
  const seen = new Set<RecipeLanguage>()
  const result: Array<[RecipeLanguage, number]> = []
  for (const [code, score] of francAll(text, { ignore: IGNORED })) {
    const language = recipeLanguageOf(code)
    if (!language || language === UNKNOWN_LANGUAGE || seen.has(language)) {
      continue
    }
    seen.add(language)
    result.push([language, score])
  }
  return result
}

// franc's first choice, if the language said to be the recipe's doesn't
// fit the text: it scores it below SAID_HOLDS of that choice.
function contradicted(
  found: ReadonlyArray<[RecipeLanguage, number]>,
  said: RecipeLanguage,
): RecipeLanguage | null {
  const first = found.at(0)
  if (!first || first[0] === said) return null
  const score = found.find(([language]) => language === said)?.[1] ?? 0
  return score < SAID_HOLDS ? first[0] : null
}

// The language a recipe is written in: the one its page states, unless
// its text is long enough to tell and franc finds the page wrong, or the
// page states none. Unknown when nothing tells.
export function recipeLanguage(
  text: string,
  stated: RecipeLanguage | null,
): RecipeLanguage {
  const found = text.length >= ENOUGH_TEXT ? identified(text) : []
  if (stated === null || stated === UNKNOWN_LANGUAGE) {
    return found.at(0)?.[0] ?? UNKNOWN_LANGUAGE
  }
  return contradicted(found, stated) ?? stated
}

// The language to offer under a recipe's language in the editor: the one
// its text is in, when the one chosen doesn't fit it, and franc has enough
// text to go on and a name to show. Null when there's none.
export function suggestedLanguage(
  text: string,
  current: RecipeLanguage,
): RecipeLanguage | null {
  if (text.length < SUGGEST_FROM) return null
  const language = contradicted(identified(text), current)
  return language && languageName(language, 'en') !== null ? language : null
}

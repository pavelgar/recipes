import { LANGUAGES } from '@/core/recipe/choices'
import type { Language } from '@/core/quantities'

// A recipe's language is the one it's written in, whichever that is, as a
// BCP 47 language subtag: "fi", "sv", "sco". Apart from it are the
// languages the app has rules for (LANGUAGES, the type Language), whose
// amounts it reads, converts and scales and whose word forms search
// knows. A recipe in another language is kept and shown as written.
export type RecipeLanguage = string

// A recipe whose language nothing tells: the page says none and its text
// is too short to identify.
export const UNKNOWN_LANGUAGE = 'und'

// The languages a recipe can be set to: the ones with a two-letter code
// (ISO 639-1) that CLDR names, as Node 24 (ICU 78, CLDR 48) does. Fixed
// here, so the list is the same in every browser.
// prettier-ignore
export const RECIPE_LANGUAGES: ReadonlyArray<RecipeLanguage> = [
 'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
 'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'ca', 'ce', 'ch',
 'co', 'cr', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'dv', 'dz', 'ee', 'el', 'en',
 'eo', 'es', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy', 'ga', 'gd',
 'gl', 'gn', 'gu', 'gv', 'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'ka',
 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw',
 'ky', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv', 'mg', 'mh', 'mi',
 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'na', 'nb', 'nd', 'ne', 'ng', 'nl',
 'nn', 'no', 'nr', 'nv', 'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi', 'pl',
 'ps', 'pt', 'qu', 'rm', 'rn', 'ro', 'ru', 'rw', 'sa', 'sc', 'sd', 'se', 'sg',
 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi', 'yo', 'za',
 'zh', 'zu',
]

// A language tag or code as the platform reads it, or null for what isn't
// one.
function localeOf(tag: string | null): Intl.Locale | null {
  if (!tag) return null
  try {
    const [canonical] = Intl.getCanonicalLocales(tag.trim().replace(/_/g, '-'))
    return canonical ? new Intl.Locale(canonical) : null
  } catch {
    return null
  }
}

// The language a tag or code names, as a recipe keeps it: "fi-FI" and
// "fin" are "fi". Null for what isn't a language tag.
export function recipeLanguageOf(tag: string | null): RecipeLanguage | null {
  const locale = localeOf(tag)
  if (!locale) return null
  // The platform gives "und" no language subtag, whatever its types say.
  const language = locale.language as string | undefined
  return language ?? UNKNOWN_LANGUAGE
}

// The region a language tag names, if it names one: "GB" for "en-GB",
// "en_gb" and "en-UK".
export function regionOf(tag: string | null): string | null {
  return localeOf(tag)?.region ?? null
}

// Whether a value is a language as a recipe keeps it: "sv", not "sv-SE"
// or "swe".
export function isRecipeLanguage(value: string): boolean {
  return recipeLanguageOf(value) === value
}

// The app's rules for a recipe's language, if it has them.
export function rulesFor(language: RecipeLanguage): Language | null {
  return LANGUAGES.find((rules) => rules === language) ?? null
}

// A language's name in the interface's language: "ruotsi" for "sv" in
// Finnish. Null for a language without one, such as an unknown one.
export function languageName(
  language: RecipeLanguage,
  locale: string,
): string | null {
  if (language === UNKNOWN_LANGUAGE) return null
  try {
    return (
      new Intl.DisplayNames([locale], {
        type: 'language',
        fallback: 'none',
      }).of(language) ?? null
    )
  } catch {
    return null
  }
}

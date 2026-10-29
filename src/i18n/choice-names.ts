import { languageName, UNKNOWN_LANGUAGE } from '@/core/languages'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import type { RecipeLanguage } from '@/core/languages'
import type { MeasuringSystem } from '@/core/quantities'

// What the interface calls a recipe's language and measuring system.

// A language's name in the interface's language: "Swedish", "ruotsi". A
// language the browser can't name shows its code.
export function recipeLanguageName(language: RecipeLanguage): string {
  if (language === UNKNOWN_LANGUAGE) return m.language_unknown()
  return languageName(language, getLocale()) ?? language
}

// Whether the browser can name a language, so it can be offered as a
// choice. Browsers carry different language data: headless Chromium names
// 132 of the 183 languages with a two-letter code, Node all of them.
export function namesLanguage(language: RecipeLanguage): boolean {
  return (
    language === UNKNOWN_LANGUAGE ||
    languageName(language, getLocale()) !== null
  )
}

// Named by a label beside or under them: "Measures: US".
export const SYSTEM_NAMES: Record<MeasuringSystem, () => string> = {
  us: m.measures_us,
  british: m.measures_british,
  australian: m.measures_australian,
  metric: m.measures_metric,
}

import { describe, expect, it } from 'vitest'
import {
  isRecipeLanguage,
  languageName,
  RECIPE_LANGUAGES,
  recipeLanguageOf,
  regionOf,
  rulesFor,
  UNKNOWN_LANGUAGE,
} from '@/lib/languages'

// Notation tests: language tags as pages write them and codes as franc
// gives them.

describe('recipeLanguageOf', () => {
  it.each([
    ['fi', 'fi'],
    ['fi-FI', 'fi'],
    ['en-US', 'en'],
    ['en_GB', 'en'],
    ['EN', 'en'],
    ['fin', 'fi'],
    ['swe', 'sv'],
    ['sco', 'sco'],
    ['und', UNKNOWN_LANGUAGE],
  ])('reads %j as %j', (tag, language) => {
    expect(recipeLanguageOf(tag)).toBe(language)
  })

  it.each(['', 'not a tag', null])('reads %j as no language', (tag) => {
    expect(recipeLanguageOf(tag)).toBeNull()
  })
})

describe('regionOf', () => {
  it.each([
    ['en-GB', 'GB'],
    ['en-gb', 'GB'],
    ['en_AU', 'AU'],
    ['en-UK', 'GB'],
    ['es-419', '419'],
    ['en', null],
    ['not a tag', null],
    [null, null],
  ])('reads %j as %j', (tag, region) => {
    expect(regionOf(tag)).toBe(region)
  })
})

describe('isRecipeLanguage', () => {
  it.each(['fi', 'sv', 'sco', UNKNOWN_LANGUAGE])('keeps %j', (code) => {
    expect(isRecipeLanguage(code)).toBe(true)
  })

  it.each(['sv-SE', 'swe', 'FI', ''])('refuses %j', (code) => {
    expect(isRecipeLanguage(code)).toBe(false)
  })
})

describe('rulesFor', () => {
  it.each([
    ['fi', 'fi'],
    ['en', 'en'],
    ['sv', null],
    [UNKNOWN_LANGUAGE, null],
  ])('gives %j the rules %j', (language, rules) => {
    expect(rulesFor(language)).toBe(rules)
  })
})

describe('languageName', () => {
  it.each([
    ['sv', 'fi', 'ruotsi'],
    ['sv', 'en', 'Swedish'],
    ['fi', 'fi', 'suomi'],
  ])('names %j in %j as %j', (language, locale, name) => {
    expect(languageName(language, locale)).toBe(name)
  })

  it('names no unknown language', () => {
    expect(languageName(UNKNOWN_LANGUAGE, 'en')).toBeNull()
  })

  // Rule check: every language a recipe can be set to has a name in both
  // interface languages.
  it.each(RECIPE_LANGUAGES)('names %s in Finnish and English', (language) => {
    expect(languageName(language, 'fi')).not.toBeNull()
    expect(languageName(language, 'en')).not.toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { UNKNOWN_LANGUAGE } from '@/lib/languages'
import { recipeLanguage, suggestedLanguage } from '@/lib/languages.server'

// Recipe texts as the import and the editor give them: the name, the
// ingredient lines and the steps, one to a line.

// https://www.arla.se/recept/sockerkaka/, its ingredients.
const SOCKERKAKA = [
  'Sockerkaka',
  '75 g Svenskt Smör från Arla®',
  '1 dl Arla Ko® Standardmjölk',
  '2 ägg',
  '2 dl strösocker',
  '2 tsk vaniljsocker',
  '3 dl vetemjöl',
  '1½ tsk bakpulver',
].join('\n')

// https://www.bonappetit.com/sponsored/recipe/black-lentil-bolognese-with-raos-homemade-arrabbiata-sauce-and-raos-homemade-spaghetti,
// all its text. franc puts Scots first for it, by a hair over English.
const BOLOGNESE = [
  'Black Lentil Bolognese with Rao’s Homemade® Arrabbiata Sauce and Rao’s Homemade® Spaghetti',
  '½ cup macadamia nuts, grated',
  '1 tsp onion powder',
  '½ tsp garlic powder',
  '1 tsp nutritional yeast powder',
  '½ tsp kosher salt',
  '¼ cup black lentils',
  '1 cup vegetable broth',
  '24 oz Rao’s Homemade® Arrabbiata Sauce',
  '½ cup pasta water',
  '1 lb Rao’s Homemade® Spaghetti',
  '1 tbsp olive oil (for the pasta water)',
  '1 tbsp kosher salt (for the pasta water)',
  'Garnish: Fresh Parsley & Red Pepper Flakes',
  'Make the macadamia nut parmesan by combining the grated parmesan, onion powder, garlic powder, nutritional yeast powder, and salt in a small bowl. Set aside.',
].join('\n')

describe('suggestedLanguage', () => {
  it.each([
    ['Swedish', SOCKERKAKA, 'en', 'sv'],
    ['Swedish', SOCKERKAKA, UNKNOWN_LANGUAGE, 'sv'],
    ['English', BOLOGNESE, 'fi', 'en'],
  ])('offers the %s a text is in, set to %j', (_, text, current, language) => {
    expect(suggestedLanguage(text, current)).toBe(language)
  })

  it.each([
    ['Swedish', SOCKERKAKA, 'sv'],
    ['English', BOLOGNESE, 'en'],
  ])('offers nothing for %s set right', (_, text, current) => {
    expect(suggestedLanguage(text, current)).toBeNull()
  })

  it('offers nothing from too little text', () => {
    expect(suggestedLanguage('Sockerkaka\n2 ägg', 'en')).toBeNull()
  })
})

describe('recipeLanguage', () => {
  it('reads English where franc would say Scots', () => {
    expect(recipeLanguage(BOLOGNESE, null)).toBe('en')
  })
})

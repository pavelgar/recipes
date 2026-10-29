import { describe, expect, it } from 'vitest'
import { extractRecipe } from '@/core/import/extract.server'
import {
  wprmIngredientSections,
  wprmRecipeLinks,
} from '@/server/import/wprm.server'
import type { ImportedRecipe } from '@/core/import/types'

// Markup and data from Skinnytaste's
// https://www.skinnytaste.com/vanilla-snowman-cupcakes-with-vanilla/
// and its REST answer, cut to what is read.

const pageUrl =
  'https://www.skinnytaste.com/vanilla-snowman-cupcakes-with-vanilla/'

const page = (head: string, body: string) =>
  `<!doctype html><html lang="en-US"><head>${head}</head><body>${body}</body></html>`

const restRoot =
  '<link rel="https://api.w.org/" href="https://www.skinnytaste.com/wp-json/" />'

const card =
  '<div id="wprm-recipe-container-49704" class="wprm-recipe-container" data-recipe-id="49704" data-servings="24"></div>'

describe('wprmRecipeLinks', () => {
  it('asks the REST root about each recipe card', () => {
    // The relish plugin's tag gives the post's id, not a recipe's.
    const html = page(
      `${restRoot}<meta name="fexy-relish" data-recipe-id="22039" />`,
      card,
    )
    expect(wprmRecipeLinks(html, pageUrl)).toEqual([
      'https://www.skinnytaste.com/wp-json/wp/v2/wprm_recipe/49704',
    ])
  })

  // As WordPress names its REST root without pretty permalinks.
  it('asks through rest_route', () => {
    const html = page(
      '<link rel="https://api.w.org/" href="https://www.skinnytaste.com/?rest_route=/" />',
      card,
    )
    expect(wprmRecipeLinks(html, pageUrl)).toEqual([
      'https://www.skinnytaste.com/?rest_route=%2Fwp%2Fv2%2Fwprm_recipe%2F49704',
    ])
  })

  it('asks only the page’s own site', () => {
    const html = page(
      '<link rel="https://api.w.org/" href="https://api.example.com/wp-json/" />',
      card,
    )
    expect(wprmRecipeLinks(html, pageUrl)).toEqual([
      'https://www.skinnytaste.com/wp-json/wp/v2/wprm_recipe/49704',
    ])
  })

  it('asks nothing of a page without recipe cards', () => {
    expect(wprmRecipeLinks(page(restRoot, ''), pageUrl)).toEqual([])
  })
})

describe('wprmIngredientSections', () => {
  const recipe = extractRecipe(
    page(
      `<script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe',
        name: 'Vanilla Snowman Cupcakes with Vanilla Icing',
        recipeIngredient: [
          '18.25 oz Duncan Hines French Vanilla cake mix (or yellow, classic white)',
          '6 oz fat free plain Chobani yogurt',
          '1 1/3 cups water',
          '2 large egg whites',
          '2 cups powdered sugar',
          '2 tbsp unsalted butter (melted)',
          '1 tsp clear vanilla extract',
          '2-3 tbsp boiling water',
          "m&m's for the eyes",
          'orange jellybeans or candy corns for the nose',
          'sprinkles for the hat',
          'mini marshmallows for the cotton part of hat',
        ],
      })}</script>`,
      '',
    ),
    pageUrl,
  ) as ImportedRecipe

  const ingredient = (
    amount: string,
    unit: string,
    name: string,
    notes = '',
  ) => ({ amount, unit, name, notes })
  const groups = [
    {
      name: '',
      ingredients: [
        ingredient(
          '18.25',
          'oz',
          'Duncan Hines French Vanilla cake mix',
          'or yellow, classic white',
        ),
        ingredient('6', 'oz', 'fat free plain Chobani yogurt'),
        ingredient('1 1/3', 'cups', 'water'),
        ingredient('2', '', 'large egg whites'),
      ],
    },
    {
      name: 'For the icing:',
      ingredients: [
        ingredient('2', 'cups', 'powdered sugar'),
        ingredient('2', 'tbsp', 'unsalted butter', 'melted'),
        ingredient('1', 'tsp', 'clear vanilla extract'),
        ingredient('2-3', 'tbsp', 'boiling water'),
      ],
    },
    {
      name: 'For the face:',
      ingredients: [
        ingredient('', '', "m&amp;m's for the eyes"),
        ingredient('', '', 'orange jellybeans or candy corns for the nose'),
        ingredient('', '', 'sprinkles for the hat'),
        ingredient('', '', 'mini marshmallows for the cotton part of hat'),
      ],
    },
  ]
  const answer = (ingredients: typeof groups) => ({
    id: 49704,
    recipe: {
      name: 'Vanilla Snowman Cupcakes with Vanilla Icing',
      ingredients,
    },
  })

  it('splits the ingredients into the groups', () => {
    expect(wprmIngredientSections(answer(groups), recipe)).toEqual([
      {
        heading: null,
        lines: [
          '18.25 oz Duncan Hines French Vanilla cake mix (or yellow, classic white)',
          '6 oz fat free plain Chobani yogurt',
          '1 1/3 cups water',
          '2 large egg whites',
        ],
      },
      {
        heading: 'For the icing',
        lines: [
          '2 cups powdered sugar',
          '2 tbsp unsalted butter (melted)',
          '1 tsp clear vanilla extract',
          '2-3 tbsp boiling water',
        ],
      },
      {
        heading: 'For the face',
        lines: [
          "m&m's for the eyes",
          'orange jellybeans or candy corns for the nose',
          'sprinkles for the hat',
          'mini marshmallows for the cotton part of hat',
        ],
      },
    ])
  })

  // The plugin leaves an ingredient without amount, unit or name out of
  // its JSON-LD.
  it('passes over an empty ingredient', () => {
    const [first, ...rest] = groups
    const withEmpty = [
      { ...first, ingredients: [ingredient('', '', ''), ...first.ingredients] },
      ...rest,
    ]
    expect(wprmIngredientSections(answer(withEmpty), recipe)).toHaveLength(3)
  })

  it('keeps one list when the answer is for other ingredients', () => {
    const [, icing, face] = groups
    expect(wprmIngredientSections(answer([icing, face]), recipe)).toBeNull()
    expect(
      wprmIngredientSections(answer([face, icing, groups[0]]), recipe),
    ).toBeNull()
  })

  // Another of Skinnytaste's recipes, with these ingredients.
  it('keeps one list when the answer names another recipe', () => {
    const other = {
      id: 48522,
      recipe: {
        name: 'Hot Chicken Philly Cheesesteak Dip',
        ingredients: groups,
      },
    }
    expect(wprmIngredientSections(other, recipe)).toBeNull()
  })

  // Just One Cookbook's answer for
  // https://www.justonecookbook.com/bacon-eggplant-soy-sauce-butter-pasta/
  // names its salt with a note the JSON-LD leaves out, and the JSON-LD
  // leaves out the long note on its soy sauce, cut short here. The first
  // group is cut to its last two ingredients.
  it('splits ingredients whose names and notes differ from the lines', () => {
    const pasta = extractRecipe(
      page(
        `<script type="application/ld+json">${JSON.stringify({
          '@type': 'Recipe',
          name: 'Bacon and Eggplant Soy Sauce Butter Pasta',
          recipeIngredient: [
            '⅛ tsp Diamond Crystal kosher salt',
            '1½ Tbsp soy sauce',
            '4 QT water',
            '1½ Tbsp Diamond Crystal kosher salt ((for the water))',
            '8 oz spaghetti ((or use linguine or fettuccine))',
          ],
        })}</script>`,
        '',
      ),
      'https://www.justonecookbook.com/bacon-eggplant-soy-sauce-butter-pasta/',
    ) as ImportedRecipe
    const salt =
      'Diamond Crystal kosher salt (use half the amount or the same weight for table salt)'
    const data = {
      id: 260805,
      recipe: {
        name: 'Bacon and Eggplant Soy Sauce Butter Pasta',
        ingredients: [
          {
            name: '',
            ingredients: [
              ingredient('⅛', 'tsp', salt),
              ingredient(
                '1½',
                'Tbsp',
                'soy sauce',
                '(concentrated noodle soup base called <a href="https://www.justonecookbook.com/mentsuyu/" data-lasso-id="168231"><em>mentsuyu</em></a> is also a great choice!',
              ),
            ],
          },
          {
            name: 'For Boiling the Spaghetti',
            ingredients: [
              ingredient('4', 'QT', 'water'),
              ingredient('1½', 'Tbsp', salt, '(for the water)'),
              ingredient(
                '8',
                'oz',
                'spaghetti',
                '(or use linguine or fettuccine)',
              ),
            ],
          },
        ],
      },
    }
    expect(wprmIngredientSections(data, pasta)).toEqual([
      {
        heading: null,
        lines: ['⅛ tsp Diamond Crystal kosher salt', '1½ Tbsp soy sauce'],
      },
      {
        heading: 'For Boiling the Spaghetti',
        lines: [
          '4 QT water',
          '1½ Tbsp Diamond Crystal kosher salt ((for the water))',
          '8 oz spaghetti ((or use linguine or fettuccine))',
        ],
      },
    ])
  })

  it('keeps one list when no group has a name', () => {
    const unnamed = [
      { name: '', ingredients: groups.flatMap((group) => group.ingredients) },
    ]
    expect(wprmIngredientSections(answer(unnamed), recipe)).toBeNull()
  })

  // The answer for the post's id, which isn't a recipe's.
  it('keeps one list for an answer that isn’t a recipe', () => {
    expect(
      wprmIngredientSections(
        {
          code: 'rest_post_invalid_id',
          message: 'Invalid post ID.',
          data: { status: 404 },
        },
        recipe,
      ),
    ).toBeNull()
  })
})

import { DomUtils, parseDocument } from 'htmlparser2'
import { fetchJson } from '@/server/import/fetch.server'
import { clean } from '@/core/import/recipe.server'
import { isThing, valuesOf } from '@/core/import/schema-org'
import type { Section } from '@/core/recipe/section'
import type { Page, Thing } from '@/core/import/schema-org'
import type { ImportedRecipe } from '@/core/import/types'

// WP Recipe Maker, the recipe plugin most WordPress food sites use, leaves
// its ingredient groups ("For the icing:") out of the JSON-LD it writes:
// one list holds the ingredients of every group. Its REST API, public
// unless a site turns it off, gives each recipe with its groups. That is
// the plugin's own published data; of the page's markup, only the recipe
// card's id is read.

// At most this many recipe cards on a page are asked about.
const MAX_RECIPES = 3

// The recipe with its ingredients in WP Recipe Maker's groups, when the
// page has the plugin's recipe cards and their REST API answers for these
// ingredients. Otherwise the recipe as it was. Asking stops at the first
// answer that can't be read: a site that turned the API off, or blocks it,
// answers every recipe alike.
export async function withWprmGroups(
  recipe: ImportedRecipe,
  html: string,
  pageUrl: string,
): Promise<ImportedRecipe> {
  for (const link of wprmRecipeLinks(html, pageUrl)) {
    const data = await fetchJson(link)
    if (data === undefined) break
    const ingredients = wprmIngredientSections(data, recipe)
    if (ingredients) return { ...recipe, ingredients }
  }
  return recipe
}

// The REST addresses of the WP Recipe Maker recipes on a page, in page
// order. Each recipe card gives its recipe's id. WordPress names its REST
// root in <link rel="https://api.w.org/">: "/wp-json/", or "/?rest_route=/"
// on a site without pretty permalinks. Only the page's own site is asked.
export function wprmRecipeLinks(html: string, pageUrl: string): Array<string> {
  const page = parseDocument(html)
  const ids = new Set<string>()
  const cards = DomUtils.findAll(
    (element) =>
      DomUtils.getAttributeValue(element, 'class')
        ?.split(/\s+/)
        .includes('wprm-recipe-container') ?? false,
    page.children,
  )
  for (const card of cards) {
    const id = DomUtils.getAttributeValue(card, 'data-recipe-id')
    if (id && /^\d+$/.test(id)) ids.add(id)
  }
  if (ids.size === 0) return []
  const root = restRoot(page, pageUrl)
  return [...ids].slice(0, MAX_RECIPES).map((id) => {
    const route = `wp/v2/wprm_recipe/${id}`
    if (root.searchParams.has('rest_route')) {
      const link = new URL(root)
      link.searchParams.set('rest_route', `/${route}`)
      return link.href
    }
    return new URL(route, root.href.replace(/\/?$/, '/')).href
  })
}

function restRoot(page: Page, pageUrl: string): URL {
  const own = new URL('/wp-json/', pageUrl)
  const link = DomUtils.findOne(
    (element) =>
      element.name === 'link' &&
      DomUtils.getAttributeValue(element, 'rel') === 'https://api.w.org/',
    page.children,
  )
  const href = link && DomUtils.getAttributeValue(link, 'href')
  if (!href || !URL.canParse(href, pageUrl)) return own
  const root = new URL(href, pageUrl)
  return root.hostname === own.hostname ? root : own
}

// The imported ingredients in WP Recipe Maker's groups, from its REST
// answer for a recipe, or null when the answer isn't for these
// ingredients or names no group. The plugin writes each JSON-LD line as
// the ingredient's amount, unit and name, without HTML, then its notes,
// and leaves out an ingredient without any of the three. The name and
// notes can differ from the answer's: Just One Cookbook's answer names
// "Diamond Crystal kosher salt (use half the amount or the same weight for
// table salt)" where its JSON-LD has "⅛ tsp Diamond Crystal kosher salt",
// and the plugin drops a note that would make the line too long. So the
// answer is for these ingredients when it names this recipe and its
// ingredients are as many as the lines, each line starting with its
// ingredient's amount and unit, in the groups' order. The lines stay as
// the JSON-LD gives them.
export function wprmIngredientSections(
  data: unknown,
  recipe: ImportedRecipe,
): Array<Section> | null {
  if (!isThing(data) || !isThing(data.recipe)) return null
  if (clean(text(data.recipe, 'name')) !== recipe.title) return null
  const lines = recipe.ingredients.flatMap((section) => section.lines)
  const sections: Array<Section> = []
  let next = 0
  for (const group of valuesOf(data.recipe, 'ingredients')) {
    if (!isThing(group)) return null
    const groupLines: Array<string> = []
    for (const ingredient of valuesOf(group, 'ingredients')) {
      if (!isThing(ingredient)) return null
      const [amount, unit, name] = ['amount', 'unit', 'name'].map((key) =>
        clean(text(ingredient, key)),
      )
      if (amount === '' && unit === '' && name === '') continue
      const line = lines.at(next)
      if (line === undefined || !line.startsWith(clean(`${amount} ${unit}`))) {
        return null
      }
      groupLines.push(line)
      next++
    }
    if (groupLines.length > 0) {
      sections.push({ heading: heading(group), lines: groupLines })
    }
  }
  if (next !== lines.length) return null
  return sections.some((section) => section.heading !== null) ? sections : null
}

// A group's name as a section heading, which the editor writes with a
// colon of its own: "For the icing:" is "For the icing".
function heading(group: Thing): string | null {
  return clean(text(group, 'name')).replace(/\s*:$/, '') || null
}

function text(thing: Thing, property: string): string {
  const value = thing[property]
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

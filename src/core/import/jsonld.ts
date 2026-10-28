import { DomUtils } from 'htmlparser2'
import { jsonrepair } from 'jsonrepair'
import { isOfType, isThing } from '@/core/import/schema-org'
import type { Page, Thing } from '@/core/import/schema-org'

// A schema.org Recipe in the page's JSON-LD, and a way to follow
// references to other items in the same data: WordPress pages give the
// recipe's publisher as {"@id": "…"}, pointing elsewhere in a @graph.
export type JsonLdRecipe = {
  recipe: Thing
  resolve: (value: unknown) => unknown
}

// Every Recipe in the page's JSON-LD, in the order the page gives them.
export function findJsonLdRecipes(page: Page): Array<JsonLdRecipe> {
  // The parser decodes attributes, so arla.fi's
  // type="application/ld&#x2B;json" matches too.
  const scripts = DomUtils.findAll(
    (element) =>
      element.name === 'script' &&
      DomUtils.getAttributeValue(element, 'type')?.trim().toLowerCase() ===
        'application/ld+json',
    page.children,
  )
  return scripts.flatMap((script) => {
    const data = parseJson(DomUtils.textContent(script))
    if (data === undefined) return []
    const recipes: Array<Thing> = []
    collectRecipes(data, recipes, 0)
    if (recipes.length === 0) return []

    const byId = new Map<string, Thing>()
    collectIds(data, byId, 0)
    const resolve = (value: unknown) => {
      if (!isThing(value) || typeof value['@id'] !== 'string') return value
      return byId.get(value['@id']) ?? value
    }
    return recipes.map((recipe) => ({ recipe, resolve }))
  })
}

// Some sites publish JSON-LD that doesn't parse. Three kotikokki.net pages
// in the corpus miss a comma between two properties, on a line break.
// jsonrepair puts back what's missing, and leaves JSON that parses alone.
function parseJson(text: string): unknown {
  try {
    return JSON.parse(jsonrepair(text))
  } catch {
    return undefined
  }
}

// Every Recipe anywhere in the data: on its own, in a list, in a @graph,
// or inside another item such as a WebPage's mainEntity.
function collectRecipes(value: unknown, recipes: Array<Thing>, depth: number) {
  if (depth > 8) return
  if (Array.isArray(value)) {
    for (const item of value) collectRecipes(item, recipes, depth + 1)
    return
  }
  if (!isThing(value)) return
  if (isOfType(value, 'Recipe')) {
    recipes.push(value)
    return
  }
  for (const property of Object.values(value)) {
    collectRecipes(property, recipes, depth + 1)
  }
}

// Items that give more than their @id, by @id, for following references.
function collectIds(value: unknown, byId: Map<string, Thing>, depth: number) {
  if (depth > 8) return
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, byId, depth + 1)
    return
  }
  if (!isThing(value)) return
  const id = value['@id']
  if (typeof id === 'string' && Object.keys(value).length > 1) {
    byId.set(id, value)
  }
  for (const property of Object.values(value)) {
    collectIds(property, byId, depth + 1)
  }
}

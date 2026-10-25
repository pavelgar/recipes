import { DomUtils } from 'htmlparser2'
import { jsonrepair } from 'jsonrepair'
import { isOfType, isThing } from '@/lib/import/schema-org'
import type { Page, Thing } from '@/lib/import/schema-org'

// The page's schema.org Recipe in JSON-LD, and a way to follow references
// to other items in the same data: WordPress pages give the recipe's
// publisher as {"@id": "…"}, pointing elsewhere in a @graph.
export type JsonLdRecipe = {
  recipe: Thing
  resolve: (value: unknown) => unknown
}

export function findJsonLdRecipe(page: Page): JsonLdRecipe | null {
  // The parser decodes attributes, so arla.fi's
  // type="application/ld&#x2B;json" matches too.
  const scripts = DomUtils.findAll(
    (element) =>
      element.name === 'script' &&
      DomUtils.getAttributeValue(element, 'type')?.trim().toLowerCase() ===
        'application/ld+json',
    page.children,
  )
  for (const script of scripts) {
    const data = parseJson(DomUtils.textContent(script))
    if (data === undefined) continue
    const recipe = findRecipe(data, 0)
    if (!recipe) continue

    const byId = new Map<string, Thing>()
    collectIds(data, byId, 0)
    const resolve = (value: unknown) => {
      if (!isThing(value) || typeof value['@id'] !== 'string') return value
      return byId.get(value['@id']) ?? value
    }
    return { recipe, resolve }
  }
  return null
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

// The first Recipe anywhere in the data: on its own, in a list, in a
// @graph, or inside another item such as a WebPage's mainEntity.
function findRecipe(value: unknown, depth: number): Thing | null {
  if (depth > 8) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const recipe = findRecipe(item, depth + 1)
      if (recipe) return recipe
    }
    return null
  }
  if (!isThing(value)) return null
  if (isOfType(value, 'Recipe')) return value
  for (const property of Object.values(value)) {
    const recipe = findRecipe(property, depth + 1)
    if (recipe) return recipe
  }
  return null
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

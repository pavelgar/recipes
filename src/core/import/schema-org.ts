import type { DomUtils, parseDocument } from 'htmlparser2'

export type Page = ReturnType<typeof parseDocument>
export type Element = ReturnType<typeof DomUtils.findAll>[number]

// A schema.org item as JSON-LD writes it: properties by name, each holding
// a value, a list of values or another item. Microdata is read into the
// same shape.
export type Thing = { readonly [property: string]: unknown }

export function isThing(value: unknown): value is Thing {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Whether an item is of the type, however its @type is written: "Recipe",
// ["Recipe", "NewsArticle"], "schema:Recipe" or "https://schema.org/Recipe".
// arla.fi writes "type" instead.
export function isOfType(thing: Thing, type: string): boolean {
  const types = [thing['@type'] ?? thing.type].flat()
  return types.some(
    (written) =>
      typeof written === 'string' &&
      (written === type ||
        written.endsWith(`/${type}`) ||
        written.endsWith(`:${type}`) ||
        written.endsWith(`#${type}`)),
  )
}

// Every value of a property, which pages give as one value or a list.
export function valuesOf(thing: Thing, property: string): Array<unknown> {
  const value = thing[property]
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

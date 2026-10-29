import { parseDocument } from 'htmlparser2'
import { findJsonLdRecipes } from '@/core/import/jsonld'
import { findMicrodataRecipes } from '@/core/import/microdata'
import { readRecipe } from '@/core/import/recipe.server'
import type { ImportedRecipe } from '@/core/import/types'

// The recipe a page publishes as schema.org data, or null. JSON-LD comes
// first: every corpus site publishes it. Microdata is the fallback.
//
// A page may publish more than one Recipe, and the first can be a stub:
// jalotofu.fi's rating plugin writes one with only a name and a rating
// before the full recipe. The first that holds a recipe is the page's.
export function extractRecipe(
  html: string,
  pageUrl: string,
): ImportedRecipe | null {
  const page = parseDocument(html)
  for (const { recipe, resolve } of findJsonLdRecipes(page)) {
    const read = readRecipe(recipe, { page, pageUrl, resolve })
    if (read) return read
  }
  for (const recipe of findMicrodataRecipes(page)) {
    const read = readRecipe(recipe, { page, pageUrl })
    if (read) return read
  }
  return null
}

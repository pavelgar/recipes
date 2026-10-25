import { parseDocument } from 'htmlparser2'
import { findJsonLdRecipe } from '@/lib/import/jsonld'
import { findMicrodataRecipe } from '@/lib/import/microdata'
import { readRecipe } from '@/lib/import/recipe'
import type { ImportedRecipe } from '@/lib/import/types'

// The recipe a page publishes as schema.org data, or null. JSON-LD comes
// first: every corpus site publishes it. Microdata is the fallback.
export function extractRecipe(
  html: string,
  pageUrl: string,
): ImportedRecipe | null {
  const page = parseDocument(html)
  const jsonLd = findJsonLdRecipe(page)
  const fromJsonLd =
    jsonLd &&
    readRecipe(jsonLd.recipe, { page, pageUrl, resolve: jsonLd.resolve })
  if (fromJsonLd) return fromJsonLd
  const microdata = findMicrodataRecipe(page)
  return microdata && readRecipe(microdata, { page, pageUrl })
}

import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { extractRecipe } from '@/core/import/extract.server'
import { fetchPage } from '@/server/import/fetch.server'
import { linkSchema, siteOf } from '@/core/import/link'
import { importPhoto } from '@/server/import/photo.server'
import { withWprmGroups } from '@/server/import/wprm.server'
import type { ImportResult } from '@/core/import/types'

// Reads the recipe on a web page, and stores its photo. The server fetches
// the page, since browsers don't let one site's page read another's. A
// POST, so the service worker never answers it from its cache: an import
// needs the page as it is now.
export const importRecipe = createServerFn({ method: 'POST' })
  .validator(z.object({ link: linkSchema }))
  .handler(async ({ data }): Promise<ImportResult> => {
    const page = await fetchPage(data.link)
    if (!page.ok) return page
    const recipe = extractRecipe(page.html, page.url)
    if (!recipe) {
      return { ok: false, error: { code: 'no-recipe', site: siteOf(page.url) } }
    }
    const [withGroups, photo] = await Promise.all([
      withWprmGroups(recipe, page.html, page.url),
      importPhoto(recipe.imageUrl),
    ])
    return { ok: true, recipe: withGroups, photo }
  })

// What the add drawer read, kept for the editor that shows it. A failed
// read isn't kept, so trying again reads the page again.
export const importQuery = (link: string) =>
  queryOptions({
    queryKey: ['import', link],
    queryFn: () => importRecipe({ data: { link } }),
    staleTime: ({ state }) => (state.data?.ok ? Infinity : 0),
    retry: false,
  })

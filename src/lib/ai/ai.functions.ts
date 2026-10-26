import { getRequest } from '@tanstack/react-start/server'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { parseDocument } from 'htmlparser2'
import { z } from 'zod'
import { getAiSettings } from '@/env.server'
import { aiModel, refusedImages } from '@/lib/ai/model.server'
import { askForRecipe, recipeFromAnswer } from '@/lib/ai/recipe.server'
import { askToTidy } from '@/lib/ai/tidy.server'
import { tidiedSteps } from '@/lib/editor/tidy'
import { fetchPage } from '@/lib/import/fetch.server'
import { linkSchema, siteOf } from '@/lib/import/link'
import { MAX_TEXT } from '@/lib/ai/limits'
import { textOfPage } from '@/lib/import/page-text'
import { MAX_PHOTO_BYTES, MAX_PHOTOS } from '@/lib/import/photos'
import type { AiModel } from '@/lib/ai/model.server'
import type { RecipeSource } from '@/lib/ai/recipe.server'
import type { AiReadResult } from '@/lib/import/types'

// Whether the container was given an AI model, so the screens can offer
// what needs one. Never the model, key or address.
export const getAiStatus = createServerFn({ method: 'GET' }).handler(() => ({
  available: getAiSettings() !== null,
}))

// Read once: the setting only changes when the container restarts, which
// brings a new page.
export const aiStatusQuery = queryOptions({
  queryKey: ['ai'],
  queryFn: () => getAiStatus(),
  staleTime: Infinity,
})

// Every read is a POST, so the service worker never answers it from its
// cache.

// Reads the recipe on a page that has no Recipe data. The page is fetched
// again, as the import fetches it, only from public addresses.
export const readPageWithAi = createServerFn({ method: 'POST' })
  .validator(z.object({ link: linkSchema }))
  .handler(async ({ data }): Promise<AiReadResult> => {
    const model = aiModel()
    if (!model) return { ok: false, error: { code: 'ai-unavailable' } }
    const fetched = await fetchPage(data.link)
    if (!fetched.ok) return fetched
    const page = parseDocument(fetched.html)
    return read(model, {
      kind: 'page',
      text: textOfPage(page),
      page,
      pageUrl: fetched.url,
      site: siteOf(fetched.url),
    })
  })

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Reads the recipe in photos, sent as form data: the browser has shrunk
// them, and they aren't kept.
export const readPhotos = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error('Expected form data')
    const photos = data.getAll('photo')
    if (photos.length === 0 || photos.length > MAX_PHOTOS) {
      throw new Error(`Expected 1 to ${MAX_PHOTOS} photos`)
    }
    return photos.map((photo) => {
      if (
        !(photo instanceof File) ||
        !PHOTO_TYPES.has(photo.type) ||
        photo.size > MAX_PHOTO_BYTES
      ) {
        throw new Error('Expected JPEG, PNG or WebP photos')
      }
      return photo
    })
  })
  .handler(async ({ data }): Promise<AiReadResult> => {
    const model = aiModel()
    if (!model) return { ok: false, error: { code: 'ai-unavailable' } }
    const photos = await Promise.all(
      data.map(async (photo) => ({
        data: new Uint8Array(await photo.arrayBuffer()),
        mediaType: photo.type,
      })),
    )
    return read(model, { kind: 'photos', photos })
  })

// Reads the recipe in text pasted into the add dialog.
export const readPastedText = createServerFn({ method: 'POST' })
  .validator(z.object({ text: z.string().trim().min(1) }))
  .handler(async ({ data }): Promise<AiReadResult> => {
    if (data.text.length > MAX_TEXT)
      return { ok: false, error: { code: 'text-too-long' } }
    const model = aiModel()
    if (!model) return { ok: false, error: { code: 'ai-unavailable' } }
    return read(model, { kind: 'text', text: data.text })
  })

async function read(
  model: AiModel,
  source: RecipeSource,
): Promise<AiReadResult> {
  try {
    const found = recipeFromAnswer(
      await askForRecipe(model, source, getRequest().signal),
      source,
    )
    if (!found) {
      return { ok: false, error: { code: 'nothing-read', from: source.kind } }
    }
    return { ok: true, ...found }
  } catch (error) {
    if (getRequest().signal.aborted) throw error
    console.error('Reading a recipe with AI failed:', error)
    if (source.kind === 'photos' && refusedImages(error)) {
      return { ok: false, error: { code: 'photos-refused' } }
    }
    return { ok: false, error: { code: 'ai-failed' } }
  }
}

export type TidyResult =
  | { ok: true; steps: string }
  | {
      ok: false
      code: 'ai-unavailable' | 'ai-failed' | 'changed-words' | 'text-too-long'
    }

// The editor's steps, each on its own line, if the model changed nothing
// but copied page clutter and where the recipe lines break.
export const tidySteps = createServerFn({ method: 'POST' })
  .validator(z.object({ steps: z.string().trim().min(1) }))
  .handler(async ({ data }): Promise<TidyResult> => {
    if (data.steps.length > MAX_TEXT)
      return { ok: false, code: 'text-too-long' }
    const model = aiModel()
    if (!model) return { ok: false, code: 'ai-unavailable' }
    try {
      const answer = await askToTidy(model, data.steps)
      const steps = tidiedSteps(data.steps, answer.steps, answer.removedLines)
      return steps === null
        ? { ok: false, code: 'changed-words' }
        : { ok: true, steps }
    } catch (error) {
      console.error('Tidying steps with AI failed:', error)
      return { ok: false, code: 'ai-failed' }
    }
  })

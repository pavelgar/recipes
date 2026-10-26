import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  emptyDraft,
  loadDraft,
  recipeFromDraft,
  saveDraft,
} from '@/lib/editor/draft'

describe('drafts kept in the browser', () => {
  let kept: Map<string, string>
  beforeEach(() => {
    kept = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => kept.set(key, value),
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the photo', () => {
    const draft = { ...emptyDraft('fi'), photo: 'q8BEXyQ1M0G3n2eW4Zp7Xw' }
    saveDraft(null, draft)
    expect(loadDraft(null)).toEqual(draft)
  })

  // One typed before an update must survive it.
  it('loads a draft kept before photos came, without one', () => {
    const { photo: _, ...before } = {
      ...emptyDraft('fi'),
      title: 'Etikkasilakat',
    }
    kept.set('recipes.drafts.v1', JSON.stringify({ manual: before }))
    expect(loadDraft(null)).toEqual({ ...before, photo: '' })
  })
})

describe('recipeFromDraft', () => {
  it('saves the photo, or none', () => {
    const draft = { ...emptyDraft('fi'), title: 'Etikkasilakat' }
    expect(recipeFromDraft(draft).photo).toBeNull()
    expect(
      recipeFromDraft({ ...draft, photo: 'q8BEXyQ1M0G3n2eW4Zp7Xw' }).photo,
    ).toBe('q8BEXyQ1M0G3n2eW4Zp7Xw')
  })
})

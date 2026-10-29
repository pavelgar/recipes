import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  draftFromImport,
  emptyDraft,
  loadDraft,
  recipeFromDraft,
  saveDraft,
} from '@/components/editor/draft'

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
    saveDraft({ kind: 'typed' }, draft)
    expect(loadDraft({ kind: 'typed' })).toEqual(draft)
  })

  // One typed before an update must survive it.
  it('loads a draft kept before photos came, without one', () => {
    const { photo: _, ...before } = {
      ...emptyDraft('fi'),
      title: 'Etikkasilakat',
    }
    kept.set('recipes.drafts.v1', JSON.stringify({ manual: before }))
    expect(loadDraft({ kind: 'typed' })).toEqual({ ...before, photo: '' })
  })

  it('loads a draft kept before AI imports came, without reworded lines', () => {
    const { reworded: _, ...before } = {
      ...emptyDraft('fi'),
      title: 'Etikkasilakat',
      photo: 'q8BEXyQ1M0G3n2eW4Zp7Xw',
    }
    kept.set('recipes.drafts.v1', JSON.stringify({ manual: before }))
    expect(loadDraft({ kind: 'typed' })).toEqual({ ...before, reworded: [] })
  })

  it('keeps an AI draft with both its photo and review markers', () => {
    const origin = { kind: 'photos' } as const
    const draft = {
      ...emptyDraft('fi'),
      title: 'Etikkasilakat',
      photo: 'q8BEXyQ1M0G3n2eW4Zp7Xw',
      reworded: ['Etikkaliemi:'],
    }
    saveDraft(origin, draft)
    expect(loadDraft(origin)).toEqual(draft)
    expect(loadDraft({ kind: 'text' })).toBeNull()
  })
})

describe('draftFromImport', () => {
  const recipe = {
    ...recipeFromDraft({ ...emptyDraft('fi'), title: 'Etikkasilakat' }),
    imageUrl: null,
  }

  it('keeps a page import’s stored cover photo', () => {
    const draft = draftFromImport(
      { ...recipe, sourceUrl: 'https://kotiliesi.fi/resepti/etikkasilakat/' },
      { photo: 'q8BEXyQ1M0G3n2eW4Zp7Xw' },
    )
    expect(draft.photo).toBe('q8BEXyQ1M0G3n2eW4Zp7Xw')
    expect(draft.reworded).toEqual([])
  })

  it('takes AI review markers without a page or cover photo', () => {
    const draft = draftFromImport(recipe, { reworded: ['Etikkaliemi:'] })
    expect(draft.sourceUrl).toBe('')
    expect(draft.photo).toBe('')
    expect(draft.reworded).toEqual(['Etikkaliemi:'])
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

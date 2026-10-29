import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FINISHED_TIMER_KEPT_MS,
  lineKeys,
  loadProgress,
  saveProgress,
} from '@/components/recipe-view/recipe-progress'
import type { Progress } from '@/components/recipe-view/recipe-progress'

// https://www.valio.fi/reseptit/tomaattinen-peltileipa/ (corpus/)
const PELTILEIPA = {
  servings: '1 uunipellillinen',
  ingredients: [
    { heading: null, lines: ['5 dl Valio maitoa', '1 rkl sokeria'] },
  ],
  steps: [
    {
      heading: null,
      lines: ['Paista uunin keskiosassa 200 asteessa n. 15 min.'],
    },
  ],
}
const [[MILK, SUGAR]] = lineKeys(PELTILEIPA.ingredients, 'ingredient')
const [[BAKE]] = lineKeys(PELTILEIPA.steps, 'step')

const NOW = 1_800_000_000_000
const PROGRESS: Progress = {
  servings: { written: '1 uunipellillinen', count: 2 },
  crossed: [MILK, SUGAR, BAKE],
  timers: [
    {
      stepKey: BAKE,
      time: 0,
      label: '15 min',
      seconds: 900,
      endsAt: NOW + 900_000,
    },
  ],
}

describe('lineKeys', () => {
  it('tells apart lines written the same', () => {
    const keys = lineKeys(
      [
        { heading: 'Taikina', lines: ['1 tl suolaa'] },
        { heading: 'Täyte', lines: ['1 tl suolaa'] },
      ],
      'ingredient',
    ).flat()
    expect(new Set(keys).size).toBe(2)
  })
})

describe('progress kept in the browser', () => {
  let kept: Map<string, string>
  beforeEach(() => {
    kept = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => kept.set(key, value),
      removeItem: (key: string) => kept.delete(key),
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('comes back as it was kept', () => {
    saveProgress(1, PROGRESS)
    expect(loadProgress(1, PELTILEIPA, NOW)).toEqual(PROGRESS)
  })

  it("keeps each recipe's apart", () => {
    saveProgress(1, PROGRESS)
    saveProgress(2, {
      ...PROGRESS,
      servings: { written: '1 uunipellillinen', count: 3 },
    })
    expect(loadProgress(1, PELTILEIPA, NOW)?.servings?.count).toBe(2)
    expect(loadProgress(2, PELTILEIPA, NOW)?.servings?.count).toBe(3)
    expect(loadProgress(3, PELTILEIPA, NOW)).toBeNull()
  })

  it('keeps nothing for a recipe back as it started', () => {
    saveProgress(1, PROGRESS)
    saveProgress(1, { servings: null, crossed: [], timers: [] })
    expect(kept.size).toBe(0)
  })

  it('drops progress on lines since changed, and keeps the rest', () => {
    saveProgress(1, PROGRESS)
    const edited = {
      ...PELTILEIPA,
      ingredients: [
        { heading: 'Taikina', lines: ['1 rkl sokeria', '5 dl maitoa'] },
      ],
      steps: [{ heading: null, lines: ['Paista 15 min.'] }],
    }
    expect(loadProgress(1, edited, NOW)).toEqual({
      servings: PROGRESS.servings,
      crossed: [SUGAR],
      timers: [],
    })
  })

  it('drops servings chosen for servings since changed', () => {
    saveProgress(1, PROGRESS)
    const edited = { ...PELTILEIPA, servings: '2 uunipellillistä' }
    expect(loadProgress(1, edited, NOW)?.servings).toBeNull()
  })

  it('drops a timer once its time has long been up', () => {
    saveProgress(1, PROGRESS)
    const up = PROGRESS.timers[0].endsAt
    expect(
      loadProgress(1, PELTILEIPA, up + FINISHED_TIMER_KEPT_MS - 1)?.timers,
    ).toHaveLength(1)
    expect(
      loadProgress(1, PELTILEIPA, up + FINISHED_TIMER_KEPT_MS)?.timers,
    ).toHaveLength(0)
  })

  it('is dropped when it no longer reads', () => {
    kept.set('recipes.progress.v1.1', '{"crossed": 3}')
    expect(loadProgress(1, PELTILEIPA, NOW)).toBeNull()
    kept.set('recipes.progress.v1.1', 'not json')
    expect(loadProgress(1, PELTILEIPA, NOW)).toBeNull()
  })

  it('lives only in the page when storage refuses it', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
    })
    expect(() => saveProgress(1, PROGRESS)).not.toThrow()
    expect(loadProgress(1, PELTILEIPA, NOW)).toBeNull()
  })
})

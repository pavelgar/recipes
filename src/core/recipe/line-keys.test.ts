import { describe, expect, it } from 'vitest'
import { lineKeys } from '@/core/recipe/line-keys'

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

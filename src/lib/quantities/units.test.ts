import { describe, expect, it } from 'vitest'
import { readQuantity } from '@/lib/quantities/quantity'
import { UNITS, readUnit } from '@/lib/quantities/units'

describe('readUnit', () => {
  it('reads every form in any case', () => {
    for (const { id, forms } of UNITS) {
      for (const form of forms) {
        for (const written of [form, form.toUpperCase()]) {
          expect(readUnit(written, 0, 'other')?.unit.id, written).toBe(id)
        }
      }
    }
  })

  it('reads mm as maustemitta only in Finnish ingredient lines', () => {
    expect(readUnit('mm', 0, 'fi-ingredient')?.unit.id).toBe('maustemitta')
    expect(readUnit('mm', 0, 'other')?.unit.id).toBe('mm')
  })

  it('needs the word to end', () => {
    expect(readUnit('garlic', 0, 'other')).toBeNull()
    expect(readUnit('levyä', 0, 'other')?.unit.id).toBe('levy')
    expect(readUnit('lehtitaikinalevyä', 0, 'other')).toBeNull()
  })

  it('reads hyphenated words as units except after in and l', () => {
    expect(readUnit('cm-square', 0, 'other')?.unit.id).toBe('cm')
    expect(readUnit('in-season', 0, 'other')).toBeNull()
    expect(readUnit('L-kokoista', 0, 'fi-ingredient')).toBeNull()
  })

  it('reads inch marks only when glued to the number', () => {
    const opts = { language: 'en', context: 'other', hyphens: false } as const
    expect(readQuantity('1/3" wide', 0, opts)?.unit?.id).toBe('in')
    expect(readQuantity('2 "', 0, opts)?.unit).toBeNull()
  })
})

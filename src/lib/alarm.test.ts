import { describe, expect, it } from 'vitest'
import { ALARM_FOR_MS, isRinging } from '@/lib/alarm'

describe('isRinging', () => {
  const endsAt = 1_800_000_000_000

  it('rings from the moment the time is up', () => {
    expect(isRinging(endsAt, endsAt - 1)).toBe(false)
    expect(isRinging(endsAt, endsAt)).toBe(true)
  })

  it('stops by itself after a while', () => {
    expect(isRinging(endsAt, endsAt + ALARM_FOR_MS - 1)).toBe(true)
    expect(isRinging(endsAt, endsAt + ALARM_FOR_MS)).toBe(false)
  })
})

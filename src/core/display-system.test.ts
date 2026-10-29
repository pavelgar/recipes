import { describe, expect, it } from 'vitest'
import { displaySystemOf } from '@/core/display-system'

describe('displaySystemOf', () => {
  it('keeps the system chosen on the device', () => {
    expect(displaySystemOf('us', 'Europe/Helsinki')).toBe('us')
    expect(displaySystemOf('metric', 'America/New_York')).toBe('metric')
  })

  it('guesses US units in a US time zone', () => {
    for (const zone of [
      'America/New_York',
      'America/Los_Angeles',
      'Pacific/Honolulu',
      'America/Indiana/Indianapolis',
      'America/Indianapolis',
      'US/Eastern',
    ]) {
      expect(displaySystemOf(undefined, zone)).toBe('us')
    }
  })

  it('guesses metric everywhere else', () => {
    for (const zone of [
      'Europe/Helsinki',
      'Europe/London',
      'America/Toronto',
      'America/Creston',
      'America/Puerto_Rico',
      'Australia/Sydney',
      'UTC',
    ]) {
      expect(displaySystemOf(undefined, zone)).toBe('metric')
    }
  })

  it('ignores a value it does not know', () => {
    expect(displaySystemOf('imperial', 'Europe/Helsinki')).toBe('metric')
  })
})

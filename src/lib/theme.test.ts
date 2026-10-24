import { describe, expect, it } from 'vitest'
import { themeOf } from '@/lib/theme'

describe('themeOf', () => {
  it('keeps the theme chosen on the device', () => {
    expect(themeOf('light')).toBe('light')
    expect(themeOf('dark')).toBe('dark')
  })

  it('follows the device until someone picks a theme', () => {
    expect(themeOf(undefined)).toBe('system')
    expect(themeOf('system')).toBe('system')
    expect(themeOf('sepia')).toBe('system')
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { webManifest } from '@/lib/web-manifest'

describe('webManifest', () => {
  it.each([
    ['en', 'Recipes'],
    ['fi', 'Reseptit'],
  ] as const)('names the app in %s', (locale, name) => {
    expect(webManifest(locale)).toMatchObject({ name, lang: locale })
  })

  // A PNG gives its width and height right after its signature.
  it.each(webManifest('en').icons)('has $src at $sizes', ({ src, sizes }) => {
    const png = readFileSync(`public${src}`)
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(sizes)
  })
})

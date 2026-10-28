import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { photoIdSchema } from '@/core/photo'
import {
  photoExists,
  readPhoto,
  storePhoto,
} from '@/server/photos/store.server'
import type { Sharp } from 'sharp'
import type { PhotoResult } from '@/core/photo'

// Photos made here, of one colour, as a camera or a site would save them.
const photo = (width: number, height: number) =>
  sharp({
    create: { width, height, channels: 3, background: '#c0603a' },
  })

async function stored(result: PhotoResult) {
  if (!result.ok) throw new Error(`Not stored: ${result.error}`)
  const bytes = await readPhoto(result.photo)
  if (!bytes) throw new Error('Not found')
  return sharp(bytes).metadata()
}

describe('storePhoto', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'photos-'))
    vi.stubEnv('PHOTOS_DIR', dir)
  })
  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(dir, { recursive: true })
  })

  it.each([
    [4000, 3000, 1600, 1200],
    [3000, 4000, 1200, 1600],
    [1200, 1200, 1200, 1200],
    // Never enlarged.
    [640, 427, 640, 427],
  ])(
    'keeps a %i × %i photo as %i × %i WebP',
    async (width, height, keptWidth, keptHeight) => {
      const bytes = await photo(width, height).jpeg().toBuffer()
      expect(await stored(await storePhoto(bytes))).toMatchObject({
        format: 'webp',
        width: keptWidth,
        height: keptHeight,
      })
    },
  )

  it.each(['png', 'webp', 'gif', 'avif'] as const)(
    'reads %s',
    async (format) => {
      const bytes = await photo(400, 300).toFormat(format).toBuffer()
      expect(await stored(await storePhoto(bytes))).toMatchObject({
        format: 'webp',
        width: 400,
        height: 300,
      })
    },
  )

  // Phones save a photo as the sensor read it, and say which way is up.
  it('turns a photo upright', async () => {
    const bytes = await photo(400, 300)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    expect(await stored(await storePhoto(bytes))).toMatchObject({
      width: 300,
      height: 400,
    })
  })

  it('leaves out where the photo was taken', async () => {
    const bytes = await photo(400, 300)
      .jpeg()
      .withExif({
        IFD0: { Copyright: 'Kotikokki' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '60/1 10/1 0/1' },
      })
      .toBuffer()
    expect((await sharp(bytes).metadata()).exif).toBeDefined()
    const kept = await stored(await storePhoto(bytes))
    expect(kept.exif).toBeUndefined()
    expect(kept.xmp).toBeUndefined()
  })

  it('names it by an id that can be its address', async () => {
    const result = await storePhoto(await photo(40, 30).jpeg().toBuffer())
    expect(result.ok && photoIdSchema.safeParse(result.photo).success).toBe(
      true,
    )
    expect(result.ok && (await photoExists(result.photo))).toBe(true)
  })

  it.each([
    [
      'text',
      new TextEncoder().encode('<!doctype html><title>Not found</title>'),
    ],
    [
      'an SVG',
      new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
    ],
    ['nothing', new Uint8Array()],
  ])('refuses %s', async (_, bytes) => {
    expect(await storePhoto(bytes)).toEqual({ ok: false, error: 'unreadable' })
  })

  it('refuses a TIFF, which no phone or site sends', async () => {
    const bytes = await photo(40, 30).tiff().toBuffer()
    expect(await storePhoto(bytes)).toEqual({ ok: false, error: 'unreadable' })
  })

  it('refuses more than 20 MB', async () => {
    expect(await storePhoto(new Uint8Array(20_000_001))).toEqual({
      ok: false,
      error: 'too-large',
    })
  })

  // A phone saves its largest photos as baseline JPEGs, which are read
  // already shrunk.
  it("keeps a phone's 48-megapixel photo", async () => {
    const bytes = await photo(8000, 6000).jpeg().toBuffer()
    expect(await stored(await storePhoto(bytes))).toMatchObject({
      width: 1600,
      height: 1200,
    })
  })

  // Just over the most pixels it can have, which depends on how much of the
  // photo is read at once: 100 megapixels, 25 for one read whole, and 8 for
  // an AVIF.
  it.each([
    ['a JPEG', 10_000, 10_001, (image: Sharp) => image.jpeg()],
    [
      'a progressive JPEG',
      5000,
      5001,
      (image: Sharp) => image.jpeg({ progressive: true }),
    ],
    [
      'an interlaced PNG',
      5000,
      5001,
      (image: Sharp) => image.png({ progressive: true }),
    ],
    ['a GIF', 5000, 5001, (image: Sharp) => image.gif()],
    ['an AVIF', 3000, 2667, (image: Sharp) => image.avif()],
  ])('refuses %s of %i × %i', async (_, width, height, encode) => {
    const bytes = await encode(photo(width, height)).toBuffer()
    expect(await storePhoto(bytes)).toEqual({ ok: false, error: 'too-large' })
  })
})

describe('readPhoto', () => {
  it('finds no photo the app never stored', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'photos-'))
    vi.stubEnv('PHOTOS_DIR', dir)
    try {
      expect(await readPhoto('AAAAAAAAAAAAAAAAAAAAAA')).toBeNull()
      expect(await photoExists('AAAAAAAAAAAAAAAAAAAAAA')).toBe(false)
    } finally {
      vi.unstubAllEnvs()
      await rm(dir, { recursive: true })
    }
  })
})

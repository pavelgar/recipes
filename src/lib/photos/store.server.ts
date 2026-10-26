import { randomBytes } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { getPhotosDir } from '@/env.server'
import { MAX_PHOTO_BYTES } from '@/lib/photos/photo'
import type { Metadata } from 'sharp'
import type { PhotoResult } from '@/lib/photos/photo'

// Cover photos are kept small enough to load quickly and to keep offline,
// and large enough for a wide screen at twice its pixel density.
const MAX_SIDE = 1600
const QUALITY = 80
// A 48-megapixel phone photo fits. Larger ones would take the server's
// memory to decode.
const MAX_PIXELS = 100_000_000

// What phones, cameras and recipe sites give. sharp reads AVIF as HEIF
// compressed with AV1; it can't read the HEVC that iPhones' HEIC uses, and
// iPhones send JPEG to web pages anyway.
function isReadable({ format, compression }: Metadata): boolean {
  return (
    ['jpeg', 'png', 'webp', 'gif'].includes(format) ||
    (format === 'heif' && compression === 'av1')
  )
}

// Stores a photo as the app keeps it: upright, fitting within 1600 × 1600
// px (never enlarged), as WebP, and without its metadata, which can hold
// where it was taken. A GIF keeps its first frame.
export async function storePhoto(bytes: Uint8Array): Promise<PhotoResult> {
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'too-large' }
  }
  let webp: Buffer
  try {
    // A slightly damaged file that still decodes, as some sites serve, is
    // read as browsers read it.
    const image = sharp(bytes, { failOn: 'error', limitInputPixels: false })
    const metadata = await image.metadata()
    if (!isReadable(metadata)) return { ok: false, error: 'unreadable' }
    if (metadata.width * metadata.height > MAX_PIXELS) {
      return { ok: false, error: 'too-large' }
    }
    webp = await image
      .rotate()
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer()
  } catch {
    return { ok: false, error: 'unreadable' }
  }

  // Nobody knows the id until it's returned, so nothing asks for a file
  // that is still being written.
  const id = randomBytes(16).toString('base64url')
  const dir = getPhotosDir()
  await mkdir(dir, { recursive: true })
  await writeFile(fileOf(id), webp, { flag: 'wx' })
  return { ok: true, photo: id }
}

export async function photoExists(id: string): Promise<boolean> {
  try {
    await access(fileOf(id))
    return true
  } catch {
    return false
  }
}

// The stored photo, or null if there's none with the id.
export async function readPhoto(id: string): Promise<Buffer | null> {
  try {
    return await readFile(fileOf(id))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

function fileOf(id: string): string {
  return join(getPhotosDir(), `${id}.webp`)
}

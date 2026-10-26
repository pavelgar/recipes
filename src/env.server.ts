import { resolve } from 'node:path'

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  return url
}

// The folder the cover photos are kept in, as an absolute path. A relative
// one is relative to the working directory, as the database's is.
export function getPhotosDir() {
  const dir = process.env.PHOTOS_DIR
  if (!dir) {
    throw new Error('PHOTOS_DIR is not set')
  }
  return resolve(dir)
}

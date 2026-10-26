// Photos of one recipe, read together as its pages: a recipe rarely runs
// over more than two, and each photo adds to how long the model takes.
export const MAX_PHOTOS = 5

// What the server takes of one photo. The browser sends each shrunk, a few
// hundred kilobytes; this leaves room for a detailed page.
export const MAX_PHOTO_BYTES = 10_000_000

// Long enough for a cookbook's small print, shorter than a phone camera's
// 4000 or more, so the upload stays quick on a phone's connection. Models
// shrink larger images themselves.
const LONG_SIDE = 2048

// A photo as it's sent: at most LONG_SIDE pixels on its long side, as a
// JPEG, turned the way the camera held it. Canvas works over plain HTTP,
// as adding a recipe must. Throws for a file the browser can't open as an
// image.
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  try {
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No canvas to shrink the photo on')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('The photo could not be saved')),
        'image/jpeg',
        0.85,
      )
    })
  } finally {
    bitmap.close()
    canvas.width = canvas.height = 0
  }
}

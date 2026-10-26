import { fetchImage } from '@/lib/import/fetch.server'
import { storePhoto } from '@/lib/photos/store.server'

// Stores the photo an imported recipe's page gives, and gives its id. A
// photo that can't be fetched or read leaves the recipe without one,
// unannounced: the recipe is still worth checking.
export async function importPhoto(
  imageUrl: string | null,
): Promise<string | null> {
  if (imageUrl === null) return null
  const bytes = await fetchImage(imageUrl)
  if (!bytes) return null
  const stored = await storePhoto(bytes)
  return stored.ok ? stored.photo : null
}

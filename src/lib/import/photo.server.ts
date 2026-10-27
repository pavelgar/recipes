import { fetchImage } from '@/lib/import/fetch.server'
import { storePhoto } from '@/lib/photos/store.server'

// Stores the photo an imported recipe's page gives, and gives its id. A
// photo that can't be fetched, read or stored leaves the recipe without
// one, unannounced: the recipe is still worth checking. Why it couldn't be
// stored, such as a full disk, goes to the server's log.
export async function importPhoto(
  imageUrl: string | null,
): Promise<string | null> {
  if (imageUrl === null) return null
  const bytes = await fetchImage(imageUrl)
  if (!bytes) return null
  try {
    const stored = await storePhoto(bytes)
    return stored.ok ? stored.photo : null
  } catch (error) {
    console.error('Could not store an imported photo:', error)
    return null
  }
}

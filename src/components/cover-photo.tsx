import { cn } from 'cn'
import { useState } from 'react'
import { photoUrl } from '@/lib/photos/photo'
import type { ReactNode } from 'react'

// The cover photo's landscape frame, which the editor keeps in place when
// there is no photo yet.
export const COVER_FRAME = 'aspect-4/3 w-full overflow-hidden rounded-xl'

// A recipe's cover photo, in a landscape frame it fills. The title beside
// it names the recipe, so the photo itself isn't announced.
//
// Offline, until photos are kept for reading there, a photo that doesn't
// load leaves no gap or broken image. With something laid over it, such as
// the editor's buttons, the frame stays for them.
export function CoverPhoto({
  id,
  children,
}: {
  id: string
  children?: ReactNode
}) {
  const [failed, setFailed] = useState<string | null>(null)
  if (failed === id && !children) return null
  return (
    <div className={cn(COVER_FRAME, 'relative bg-muted')}>
      {failed !== id && (
        <img
          src={photoUrl(id)}
          alt=""
          onError={() => setFailed(id)}
          className="size-full object-cover"
        />
      )}
      {children}
    </div>
  )
}

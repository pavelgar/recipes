import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { registerSW } from 'virtual:pwa-register'

// Start's default client entry, plus the service worker
// (src/service-worker/sw.ts). It registers once the page has loaded, and
// reloads the page when a new version takes over. Browsers without service
// workers, including any page served over plain HTTP, skip it and work
// online only.
registerSW()

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})

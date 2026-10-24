import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { registerSW } from 'virtual:pwa-register'
import { keepInstallPrompt } from '@/hooks/use-install-prompt'
import { followDeviceTheme } from '@/hooks/use-theme'

// Start's default client entry, plus the service worker
// (src/service-worker/sw.ts). It registers once the page has loaded, and
// reloads the page when a new version takes over. Browsers without service
// workers, including any page served over plain HTTP, skip it and work
// online only.
registerSW()
// For the Install button in settings.
keepInstallPrompt()
followDeviceTheme()

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})

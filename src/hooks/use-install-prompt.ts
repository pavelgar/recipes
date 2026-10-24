import { useSyncExternalStore } from 'react'

// The install dialog that Chromium browsers let a page open, and the flag
// Safari on iPhone sets in an app opened from the home screen. Neither is in
// TypeScript's DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<unknown>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
  interface Navigator {
    standalone?: boolean
  }
}

let installPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function setInstallPrompt(prompt: BeforeInstallPromptEvent | null) {
  installPrompt = prompt
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// The browser offers the dialog soon after a page loads, on whichever screen
// that is, so src/client.tsx keeps it from the start for the settings
// screen.
export function keepInstallPrompt() {
  window.addEventListener('beforeinstallprompt', setInstallPrompt)
  window.addEventListener('appinstalled', () => setInstallPrompt(null))
}

// Opens the browser's install dialog, or null when the browser doesn't
// offer one. Each offer opens once.
export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, () => installPrompt)
  if (!prompt) return null
  return () => {
    setInstallPrompt(null)
    void prompt.prompt()
  }
}

// Opened from the home screen or dock rather than in a browser tab.
export function isInstalledApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true
  )
}

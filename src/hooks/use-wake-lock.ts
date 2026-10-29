import { useEffect } from 'react'

// Keeps the screen on while the component is mounted, where the browser
// allows it, and takes the lock again when the page comes back into view,
// since the browser releases it whenever the page is hidden.
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        // Checked for above: over plain HTTP the screen isn't kept on, and
        // nothing else changes.
        // eslint-disable-next-line no-restricted-properties
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else lock = next
      } catch {
        // Refused, as on low battery: the screen dims as it normally would.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])
}

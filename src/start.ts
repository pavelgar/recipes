import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'

import { DISPLAY_SYSTEM_COOKIE } from '@/lib/display-system'
import { MAX_PHOTO_BYTES } from '@/lib/photos/photo'
import { PREFERENCE_MAX_AGE } from '@/lib/preferences'
import { THEME_COOKIE } from '@/lib/theme'
import { cookieName as LOCALE_COOKIE } from '@/paraglide/runtime'

// The largest server function call the app makes: a photo, with the form
// around it.
const MAX_CALL_BYTES = MAX_PHOTO_BYTES + 1_000_000

// Start reads a server function call's body whole before anything checks
// it, and anyone on the network can make a call. So a call larger than any
// the app makes is refused unread, and so is one that doesn't say its
// size: Node stops a body at the size it says, and the app's own calls
// always say it.
const limitCallSize = createMiddleware().server(
  ({ next, request, handlerType }) => {
    if (handlerType === 'serverFn') {
      if (request.headers.has('transfer-encoding')) {
        return new Response(null, { status: 411 })
      }
      const size = Number(request.headers.get('content-length') ?? 0)
      if (!(size <= MAX_CALL_BYTES)) {
        return new Response(null, { status: 413 })
      }
    }
    return next()
  },
)

// The interface language, units and theme are set per device, in cookies
// the browser writes. Safari keeps a cookie written in the browser for 7 days
// at most, so they would reset after a week away. The same cookie sent
// from the server lasts as long as it asks, so every page renews them.
const renewPreferences = createMiddleware().server(({ next, handlerType }) => {
  if (handlerType === 'router') {
    for (const name of [LOCALE_COOKIE, DISPLAY_SYSTEM_COOKIE, THEME_COOKIE]) {
      const value = getCookie(name)
      if (value) {
        setCookie(name, value, { maxAge: PREFERENCE_MAX_AGE, sameSite: 'lax' })
      }
    }
  }
  return next()
})

export const startInstance = createStart(() => ({
  // The server renders the page around the screens: the document, the menu,
  // the interface language and the sidebar (the root route sets ssr: true).
  // Screens render in the browser from data loaded through server
  // functions. Any page the server sends can then start the app at any
  // address, which is what the service worker serves offline.
  defaultSsr: false,
  // Start applies this check that server function calls come from the app's
  // own pages only when this file doesn't exist.
  requestMiddleware: [
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' }),
    limitCallSize,
    renewPreferences,
  ],
}))

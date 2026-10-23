// The service worker, which keeps the app readable offline. It answers with
// the app's built files from its own cache. Pages and data come from the
// server when it answers in time, otherwise from what was saved last.
// Browsers run service workers only over HTTPS and on localhost.

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { enable as enableNavigationPreload } from 'workbox-navigation-preload'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { warmStrategyCache } from 'workbox-recipes'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import type { WorkboxPlugin } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// A new version takes over as soon as it's installed, and open pages reload
// into it (src/client.tsx). Pages, built files and server functions then
// always come from the same build.
void self.skipWaiting()
clientsClaim()

// The built JavaScript, styles, fonts and favicons, listed at build time.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// How long the server gets before the cached copy is used instead, so a
// weak connection doesn't leave the screen blank.
const networkTimeoutSeconds = 3

// The server renders only the page around the screens (src/start.ts), so
// any page it sends can start the app at any address. The latest one is
// kept under a single key and opens every address offline.
const latestPage: WorkboxPlugin = {
  cacheKeyWillBeUsed: async () => '/offline-page',
  cacheWillUpdate: async ({ response }) =>
    response.status === 200 &&
    response.headers.get('Content-Type')?.startsWith('text/html')
      ? response
      : null,
}

const pages = new NetworkFirst({
  cacheName: 'pages',
  networkTimeoutSeconds,
  plugins: [latestPage],
})

// Starts loading the page while the service worker starts up.
enableNavigationPreload()
registerRoute(new NavigationRoute(pages))

// Saves a page while installing, so the app opens offline even before the
// next visit.
warmStrategyCache({ urls: ['/'], strategy: pages })

// Server functions that read are GET requests; writes are POST, which this
// route leaves alone. What the screens read last is there offline too.
// Without a plugin of its own, Workbox saves only successful responses.
registerRoute(
  ({ url }) => url.pathname.startsWith('/_serverFn/'),
  new NetworkFirst({
    cacheName: 'data',
    networkTimeoutSeconds,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, purgeOnQuotaError: true }),
    ],
  }),
)

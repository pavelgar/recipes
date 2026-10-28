import {
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { cn } from 'cn'

import { AppShell, getSidebarOpen } from '@/components/app-shell'
import { Toaster } from '@/components/ui/toast'
import { themeScript } from '@/core/theme'
import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools'

import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

import appCss from '@/styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // Rendered on the server, unlike the screens inside it (src/start.ts).
  ssr: true,
  beforeLoad: async () => {
    // Other redirect strategies are possible; see
    // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale())
    }
  },

  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        // Cover lets the bottom bar reach under the iPhone home indicator;
        // the app shell pads by the safe-area insets instead.
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: m.app_name(),
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // The app's name in the manifest follows the interface language.
      {
        rel: 'manifest',
        href: `/manifest.webmanifest?locale=${getLocale()}`,
      },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      {
        rel: 'icon',
        href: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
    ],
  }),
  loader: () => ({ sidebarOpen: getSidebarOpen() }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  const { sidebarOpen } = Route.useLoaderData()
  return (
    <AppShell sidebarOpen={sidebarOpen}>
      <Outlet />
    </AppShell>
  )
}

// In a phone's browser the page itself scrolls, so Safari can tuck its
// toolbar away and show the page under it, and pulling down reloads. Fixed
// elements move with the page when it bounces there. Elsewhere each screen
// scrolls in the app shell's scroll area (scroll-inside), so the bars stay
// put.
const SCROLL_INSIDE =
  'scroll-inside:h-full scroll-inside:overflow-hidden scroll-inside:overscroll-y-none'

// While a backdrop is up:
// - Safari 26 on iPhone draws no fixed layer behind its floating toolbar, a
//   backdrop included. Where the page ends before the toolbar does, the
//   page's own background shows there, so it takes the colour the backdrop
//   gives the page: black at 80%.
// - Safari on iPhone still lets the page scroll under it. The page doesn't
//   bounce, so the backdrop doesn't bounce away from what it covers.
const PAGE_BACKGROUND =
  'bg-(--page-background) transition-colors duration-450 ease-[cubic-bezier(0.32,0.72,0,1)]'
const HTML = cn(
  SCROLL_INSIDE,
  PAGE_BACKGROUND,
  '[--page-background:var(--background)] backdrop-up:overscroll-y-none backdrop-up:[--page-background:color-mix(in_srgb,var(--background)_20%,black)]',
)
// Positioned, so a backdrop can cover the whole page (dialog.tsx).
const BODY = cn(
  SCROLL_INSIDE,
  PAGE_BACKGROUND,
  'relative scroll-inside:fixed scroll-inside:inset-0',
)

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // The theme script below sets the theme on <html> before React starts.
    <html lang={getLocale()} className={HTML} suppressHydrationWarning>
      <head>
        {/* Before anything paints, so a dark page never flashes light. */}
        <ScriptOnce children={themeScript} />
        <HeadContent />
      </head>
      <body className={BODY}>
        {/* Long enough to reach Undo with busy hands. */}
        <Toaster timeout={10_000}>{children}</Toaster>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

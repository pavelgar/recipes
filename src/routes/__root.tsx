import {
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { AppShell, getSidebarOpen } from '@/components/app-shell'
import { Toaster } from '@/components/ui/toast'
import { themeScript } from '@/lib/theme'
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // The theme script below sets the theme on <html> before React starts.
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        {/* Before anything paints, so a dark page never flashes light. */}
        <ScriptOnce children={themeScript} />
        <HeadContent />
      </head>
      <body>
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

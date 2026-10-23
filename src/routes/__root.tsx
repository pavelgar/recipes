import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { AppShell, getSidebarOpen } from '@/components/app-shell'
import { Toaster } from '@/components/ui/toast'
import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools'

import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

import appCss from '@/styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
    <html lang={getLocale()}>
      <head>
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

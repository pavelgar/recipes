import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { FileQuestionMarkIcon } from 'lucide-react'
import { routeTree } from '@/routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { MAIN_SCROLL_AREA } from '@/components/app-shell'
import { NotFound } from '@/components/not-found'
import { m } from '@/paraglide/messages'

export function getRouter() {
  const context = { queryClient: new QueryClient() }

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    scrollToTopSelectors: [MAIN_SCROLL_AREA],
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // An address the app has no page for. A screen can say more about what
    // it couldn't find with a notFoundComponent of its own.
    defaultNotFoundComponent: () => (
      <NotFound
        icon={FileQuestionMarkIcon}
        title={m.not_found_title()}
        description={m.not_found_description()}
      />
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface HistoryState {
    aiRead?: string
  }
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

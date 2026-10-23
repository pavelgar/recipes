import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

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
  ],
}))

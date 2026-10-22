import handler from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server'

// Makes the locale cookie available to getLocale() during SSR.
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}

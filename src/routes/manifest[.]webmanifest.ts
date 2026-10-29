import { createFileRoute } from '@tanstack/react-router'
import { webManifest } from '@/routes/-web-manifest'
import { baseLocale, isLocale } from '@/paraglide/runtime'

// Browsers fetch the manifest without cookies, so the root route puts the
// interface language in its address instead.
export const Route = createFileRoute('/manifest.webmanifest')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const locale = new URL(request.url).searchParams.get('locale')
        return Response.json(
          webManifest(isLocale(locale) ? locale : baseLocale),
          { headers: { 'Content-Type': 'application/manifest+json' } },
        )
      },
    },
  },
})

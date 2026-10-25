import { MIMEType } from 'node:util'
import { decodeBuffer } from 'encoding-sniffer'
import fetch, { FetchError } from 'node-fetch'
import { globalHttpAgent, globalHttpsAgent } from 'request-filtering-agent'
import { siteOf } from '@/lib/import/link'
import type { ImportError } from '@/lib/import/types'

export type FetchedPage =
  { ok: true; html: string; url: string } | { ok: false; error: ImportError }

const TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 5
// Recipe pages run to a few hundred kilobytes.
const MAX_BYTES = 5_000_000

const PAGE_TYPES = new Set(['text/html', 'application/xhtml+xml'])

// Identifies the app to the site, as the corpus collection did.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (compatible; Recipes; +https://github.com/pavelgar/recipes)',
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
}

// Fetches a web page for import, following redirects.
//
// Anyone who can open the app can make the server fetch a page, so it
// fetches only from public addresses. Otherwise a link could reach the
// server's own network: the router, other containers, the cloud
// provider's metadata service. request-filtering-agent checks the address
// each connection goes to, redirects included, as it connects, so a name
// can't resolve to a public address for a check and a private one for the
// fetch. Only ordinary public (unicast) addresses pass: not private
// networks, loopback, link-local, carrier-grade NAT (which Tailscale
// uses), multicast or reserved ranges.
export async function fetchPage(link: string): Promise<FetchedPage> {
  try {
    const response = await fetch(link, {
      headers: HEADERS,
      agent: (url) =>
        url.protocol === 'http:' ? globalHttpAgent : globalHttpsAgent,
      follow: MAX_REDIRECTS,
      size: MAX_BYTES,
      // Also drops a body left unread below.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const site = siteOf(response.url)
    if (!response.ok) {
      return {
        ok: false,
        error: { code: 'http-error', site, status: response.status },
      }
    }
    const type = mimeType(response.headers.get('content-type'))
    if (!type || !PAGE_TYPES.has(type.essence)) {
      return { ok: false, error: { code: 'not-a-page', site } }
    }
    const html = pageText(await response.arrayBuffer(), type)
    return { ok: true, html, url: response.url }
  } catch (error) {
    return { ok: false, error: { code: failure(error), site: siteOf(link) } }
  }
}

// Why a page couldn't be read. request-filtering-agent says that it
// refused an address only in its error's message, which node-fetch passes
// on in its own.
function failure(
  error: unknown,
): 'private-address' | 'too-large' | 'unreachable' {
  if (!(error instanceof FetchError)) return 'unreachable'
  if (error.message.includes(' is not allowed.')) return 'private-address'
  return error.type === 'max-size' ? 'too-large' : 'unreachable'
}

// The page as text, in its charset, found the way browsers find it: from a
// byte order mark, the server's Content-Type or a <meta charset>. Pages
// that don't say are read as UTF-8.
export function pageText(body: ArrayBuffer, type: MIMEType): string {
  return decodeBuffer(Buffer.from(body), {
    transportLayerEncodingLabel: type.params.get('charset') ?? undefined,
    defaultEncoding: 'utf-8',
  })
}

function mimeType(header: string | null): MIMEType | null {
  try {
    return header === null ? null : new MIMEType(header)
  } catch {
    return null
  }
}

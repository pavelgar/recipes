import { MIMEType } from 'node:util'
import { decodeBuffer } from 'encoding-sniffer'
import fetch, { FetchError } from 'node-fetch'
import {
  RequestFilteringHttpAgent,
  globalHttpAgent,
  globalHttpsAgent,
} from 'request-filtering-agent'
import { siteOf } from '@/core/import/link'
import { MAX_PHOTO_BYTES } from '@/core/photo'
import type { ImportError } from '@/core/import/types'

export type FetchedPage =
  { ok: true; html: string; url: string } | { ok: false; error: ImportError }

const TIMEOUT_MS = 15_000
// What a page points to is extra: waiting long for it would only delay an
// import that already has its recipe.
const JSON_TIMEOUT_MS = 5_000
// Recipe photos run to a few megabytes.
const IMAGE_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5
// Recipe pages run to a few hundred kilobytes.
const MAX_BYTES = 5_000_000

const PAGE_TYPES = new Set(['text/html', 'application/xhtml+xml'])

// Identifies the app to the site, as the corpus collection did.
const USER_AGENT =
  'Mozilla/5.0 (compatible; Recipes; +https://github.com/pavelgar/recipes)'

// Fetches from a site, following redirects.
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
//
// The end-to-end tests' build (vite build --mode e2e) also reaches their
// own pages, tests/e2e/test-site.ts, over plain HTTP on this machine's loopback
// address. Vite writes the mode into the code as it builds, so every other
// build, the image's among them, leaves that agent out: no setting can
// bring it back.
const httpAgent =
  import.meta.env.MODE === 'e2e'
    ? new RequestFilteringHttpAgent({ allowIPAddressList: ['127.0.0.1'] })
    : globalHttpAgent

function request(
  link: string,
  accept: string,
  timeoutMs: number,
  maxBytes = MAX_BYTES,
) {
  return fetch(link, {
    headers: { 'user-agent': USER_AGENT, accept },
    agent: (url) => (url.protocol === 'http:' ? httpAgent : globalHttpsAgent),
    follow: MAX_REDIRECTS,
    size: maxBytes,
    // Also drops a body left unread.
    signal: AbortSignal.timeout(timeoutMs),
  })
}

// Fetches a web page for import.
export async function fetchPage(link: string): Promise<FetchedPage> {
  try {
    const response = await request(
      link,
      'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      TIMEOUT_MS,
    )
    const site = siteOf(response.url)
    if (!response.ok) {
      if (isChallenge(response.headers)) {
        return { ok: false, error: { code: 'blocked', site } }
      }
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

// Fetches JSON that a page points to, such as WP Recipe Maker's recipes,
// or undefined if it can't be read.
export async function fetchJson(link: string): Promise<unknown> {
  try {
    const response = await request(link, 'application/json', JSON_TIMEOUT_MS)
    const type = mimeType(response.headers.get('content-type'))
    if (!response.ok || type?.essence !== 'application/json') return undefined
    return await response.json()
  } catch {
    return undefined
  }
}

// Fetches the photo a page gives, or undefined if it can't be read. What it
// is, the photo store tells from the file itself: sites write image/jpg,
// and some serve WebP from an address ending in .jpg. AVIF isn't asked for,
// so a site that could send either sends WebP: the store takes AVIF only
// up to 8 megapixels, which reading it needs much more memory for.
export async function fetchImage(
  link: string,
): Promise<Uint8Array | undefined> {
  try {
    const response = await request(
      link,
      'image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.1',
      IMAGE_TIMEOUT_MS,
      MAX_PHOTO_BYTES,
    )
    if (!response.ok) return undefined
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return undefined
  }
}

// Whether the site answered with a check that only a browser passes.
// Cloudflare (K-Ruoka, Atria) and Vercel (S-Kaupat) mark it, whatever the
// status: S-Kaupat's is a 429, which would otherwise read as a site to try
// again later.
export function isChallenge(headers: {
  get: (name: string) => string | null
}): boolean {
  return ['cf-mitigated', 'x-vercel-mitigated'].some(
    (name) => headers.get(name)?.trim().toLowerCase() === 'challenge',
  )
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

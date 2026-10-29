import { MIMEType } from 'node:util'
import { describe, expect, it } from 'vitest'
import { fetchPage, isChallenge, pageText } from '@/server/import/fetch.server'
import { siteOf } from '@/core/import/link'

describe('fetchPage', () => {
  // request-filtering-agent refuses these as it connects, so the test
  // stays off the network. If a new version words its refusals
  // differently, these come out as unreachable instead.
  it.each([
    'http://127.0.0.1/',
    'http://10.0.0.2/',
    'http://172.20.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    // Tailscale.
    'http://100.101.102.103/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[fd7a:115c:a1e0::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
    // Found by a DNS lookup.
    'http://localhost/',
  ])('refuses %s', async (link) => {
    expect(await fetchPage(link)).toEqual({
      ok: false,
      error: { code: 'private-address', site: siteOf(link) },
    })
  })
})

describe('isChallenge', () => {
  // As K-Ruoka (Cloudflare) and S-Kaupat (Vercel) answered in October 2026.
  it.each([
    [{ 'cf-mitigated': 'challenge' }],
    [{ 'x-vercel-mitigated': 'challenge' }],
  ])('finds a challenge in %j', (headers) => {
    expect(isChallenge(new Headers(headers))).toBe(true)
  })

  it('finds none in a plain refusal', () => {
    expect(isChallenge(new Headers({ server: 'cloudflare' }))).toBe(false)
  })
})

describe('pageText', () => {
  const html = new MIMEType('text/html')
  // Text in the single-byte charset of older Finnish pages, and in UTF-8.
  const latin1 = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0))
  const bytes = (text: string) => new TextEncoder().encode(text)

  it('reads the charset the server names', () => {
    expect(
      pageText(
        latin1('<p>kesäkurpitsaa raastettuna</p>').buffer,
        new MIMEType('text/html; charset=ISO-8859-1'),
      ),
    ).toBe('<p>kesäkurpitsaa raastettuna</p>')
  })

  it('reads a <meta charset> when the server names none', () => {
    const page = '<meta charset="windows-1252"><p>kesäkurpitsaa raastettuna</p>'
    expect(pageText(latin1(page).buffer, html)).toBe(page)
  })

  it('goes by the server over a <meta charset>', () => {
    const page = '<meta charset="windows-1252"><p>kesäkurpitsaa raastettuna</p>'
    expect(
      pageText(bytes(page).buffer, new MIMEType('text/html; charset=utf-8')),
    ).toBe(page)
  })

  it('reads UTF-8 when nothing names a charset', () => {
    expect(
      pageText(bytes('<p>kesäkurpitsaa raastettuna</p>').buffer, html),
    ).toBe('<p>kesäkurpitsaa raastettuna</p>')
  })
})

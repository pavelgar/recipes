import { afterEach, describe, expect, it, vi } from 'vitest'
import { robotsOf } from './robots.ts'

const ORIGIN = 'https://example.org'

function respond(text: string, status = 200) {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(text, { status }))
  vi.stubGlobal('fetch', request)
  return request
}

afterEach(() => vi.unstubAllGlobals())

describe('the page collector’s robots.txt rules', () => {
  it.each([500, 503, 599])('stops on HTTP %s', async (status) => {
    respond('Service unavailable', status)

    await expect(robotsOf(ORIGIN)).rejects.toThrow(
      `${ORIGIN}/robots.txt: HTTP ${status}`,
    )
  })

  it('stops when robots.txt cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
    )

    await expect(robotsOf(ORIGIN)).rejects.toThrow('offline')
  })

  it('allows collection when robots.txt is missing', async () => {
    const request = respond('Not found', 404)
    const robots = await robotsOf(ORIGIN)

    expect(robots.allows('/recipes/first')).toBe(true)
    expect(robots.delayMs).toBe(0)
    expect(request).toHaveBeenCalledWith(`${ORIGIN}/robots.txt`, {
      headers: { 'user-agent': 'Recipes' },
    })
  })

  it('obeys every matching group, leaving wildcard groups out', async () => {
    respond(`User-agent: *
Disallow: /

User-agent: Recipes
Disallow: /first

User-agent: recipes
Disallow: /second
`)
    const robots = await robotsOf(ORIGIN)

    expect(robots.allows('/first')).toBe(false)
    expect(robots.allows('/second')).toBe(false)
    expect(robots.allows('/third')).toBe(true)
  })

  it('obeys every wildcard group when none names Recipes', async () => {
    respond(`User-agent: OtherBot
Disallow: /

User-agent: *
Disallow: /first

User-agent: *
Disallow: /second
`)
    const robots = await robotsOf(ORIGIN)

    expect(robots.allows('/first')).toBe(false)
    expect(robots.allows('/second')).toBe(false)
    expect(robots.allows('/third')).toBe(true)
  })

  it('uses the most specific rule across matching groups', async () => {
    respond(`User-agent: Recipes
Disallow: /recipes/

User-agent: Recipes
Allow: /recipes/public/
`)
    const robots = await robotsOf(ORIGIN)

    expect(robots.allows('/recipes/private/first')).toBe(false)
    expect(robots.allows('/recipes/public/first')).toBe(true)
  })

  it('prefers Allow when matching groups give equivalent rules', async () => {
    respond(`User-agent: Recipes
Disallow: /recipes/

User-agent: Recipes
Allow: /recipes/
`)

    expect((await robotsOf(ORIGIN)).allows('/recipes/first')).toBe(true)
  })

  it.each([
    ['2', '7', 7000],
    ['7', '2', 7000],
    ['10s', '4', 4000],
    ['10s', 'invalid', 0],
  ])(
    'respects both crawl delays, %s and %s',
    async (first, second, delayMs) => {
      respond(`User-agent: Recipes
Crawl-delay: ${first}

User-agent: Recipes
Crawl-delay: ${second}
`)

      expect((await robotsOf(ORIGIN)).delayMs).toBe(delayMs)
    },
  )
})

import { describe, expect, it } from 'vitest'
import { findLink, linkSchema, siteOf } from '@/lib/import/link'

const LINKS = [
  [
    'https://kotiliesi.fi/resepti/etikkasilakat/',
    'https://kotiliesi.fi/resepti/etikkasilakat/',
  ],
  // Shared from an app, with the page's title first.
  [
    'Etikkasilakat https://kotiliesi.fi/resepti/etikkasilakat/',
    'https://kotiliesi.fi/resepti/etikkasilakat/',
  ],
  // Typed without https://.
  [
    'www.valio.fi/reseptit/ananas-rahkajuoma/',
    'https://www.valio.fi/reseptit/ananas-rahkajuoma/',
  ],
  [
    'valio.fi/reseptit/ananas-rahkajuoma',
    'https://valio.fi/reseptit/ananas-rahkajuoma',
  ],
  ['kotiliesi.fi', 'https://kotiliesi.fi/'],
  // A newer top-level domain.
  ['example.recipes/pulla', 'https://example.recipes/pulla'],
  [
    '//kotiliesi.fi/resepti/etikkasilakat/',
    'https://kotiliesi.fi/resepti/etikkasilakat/',
  ],
  // IP addresses, and the server's own address with its scheme written
  // out. The server then refuses the private ones.
  ['1.1.1.1', 'https://1.1.1.1/'],
  ['192.168.1.1/admin', 'https://192.168.1.1/admin'],
  ['http://localhost:3417/', 'http://localhost:3417/'],
  // Without https://, after other text.
  [
    'Etikkasilakat kotiliesi.fi/resepti/etikkasilakat/',
    'https://kotiliesi.fi/resepti/etikkasilakat/',
  ],
  ['Katso kotiliesi.fi', 'https://kotiliesi.fi/'],
  // In brackets.
  [
    '(https://www.recipetineats.com/baked-pumpkin-risotto/)',
    'https://www.recipetineats.com/baked-pumpkin-risotto/',
  ],
  // Ending a sentence.
  [
    'Try this: https://www.recipetineats.com/baked-pumpkin-risotto/.',
    'https://www.recipetineats.com/baked-pumpkin-risotto/',
  ],
  [
    '  https://www.kotikokki.net/reseptit/nayta/869770/Intialaista%20kanaa%20voissa/\n',
    'https://www.kotikokki.net/reseptit/nayta/869770/Intialaista%20kanaa%20voissa/',
  ],
] as const

describe('findLink', () => {
  it.each(LINKS)('finds the link in %j', (text, link) => {
    expect(findLink(text)).toBe(link)
  })

  // The server function and the add page check links with linkSchema.
  it.each(LINKS)('gives a link from %j that linkSchema accepts', (text) => {
    expect(linkSchema.safeParse(findLink(text)).success).toBe(true)
  })

  it.each([
    '',
    'Etikkasilakat',
    '1,5 dl',
    '1.5',
    '1.1.1',
    'e.g.',
    'ftp://valio.fi/',
    'mailto:someone@example.com',
    // Without a scheme, only names with a top-level domain count.
    'localhost:3417',
  ])('finds no link in %j', (text) => {
    expect(findLink(text)).toBeNull()
  })
})

describe('siteOf', () => {
  it('names the site without www', () => {
    expect(siteOf('https://www.valio.fi/reseptit/ananas-rahkajuoma/')).toBe(
      'valio.fi',
    )
  })
})

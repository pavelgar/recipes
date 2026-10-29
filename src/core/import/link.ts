import { LinkifyIt } from 'linkify-it'
import tlds from 'tlds'
import { z } from 'zod'

// Finds links in text the way markdown-it does, with or without https://:
// "valio.fi/reseptit/…", "1.1.1.1", or the link in text shared with the
// page's title before it ("Etikkasilakat https://kotiliesi.fi/…"). Without
// https://, an address counts only if it ends in a real top-level domain,
// which keeps "e.g." and "1.5" from passing as links. linkify-it knows only
// the common ones; tlds adds the rest, such as .blog and .recipes.
const linkify = new LinkifyIt()
  .set({ fuzzyLink: true, fuzzyIP: true })
  .tlds(tlds, true)

// The first web address in what was pasted, shared or typed, as https://
// when written without its scheme, or null.
export function findLink(text: string): string | null {
  for (const match of linkify.match(text) ?? []) {
    const link =
      match.schema === ''
        ? `https://${match.raw}`
        : match.schema === '//'
          ? `https:${match.raw}`
          : match.url
    if (linkSchema.safeParse(link).success) return new URL(link).href
  }
  return null
}

// A link the app imports from: a web page's address. The import server
// function checks what it's given with it, and the add page its ?link=.
export const linkSchema = z.url({ protocol: /^https?$/ }).max(2048)

// The site a link points to, as people say it: "valio.fi", not
// "www.valio.fi".
export function siteOf(link: string): string {
  return new URL(link).hostname.replace(/^www\./, '')
}

import { createServer } from 'node:http'
import { PELTILEIPA } from './recipes.ts'

// Pages to import, for the app the e2e tests run against. Only its e2e
// build reaches this machine's address (src/lib/import/fetch.server.ts).
// The pages are built around the real recipe, in the forms sites publish
// it, and the answers sites give when they don't.

const port = Number(process.env.PORT)

const page = (head: string, body: string) =>
  `<!doctype html><html lang="fi"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`

const recipeData = {
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: PELTILEIPA.title,
  recipeYield: PELTILEIPA.servings,
  recipeIngredient: PELTILEIPA.ingredients,
  recipeInstructions: PELTILEIPA.steps.map((text) => ({
    '@type': 'HowToStep',
    text,
  })),
}

const pages: Partial<
  Record<
    string,
    { status: number; headers?: Record<string, string>; body: string }
  >
> = {
  // Recipe data in JSON-LD, as every Finnish site in the corpus publishes.
  '/resepti': {
    status: 200,
    body: page(
      `<title>${PELTILEIPA.title}</title><meta property="og:site_name" content="Testisivu"><script type="application/ld+json">${JSON.stringify(recipeData)}</script>`,
      `<h1>${PELTILEIPA.title}</h1>`,
    ),
  },
  // The recipe only as text a reader sees, as sydanmerkki.fi and martat.fi
  // publish theirs.
  '/teksti': {
    status: 200,
    body: page(
      `<title>${PELTILEIPA.title}</title>`,
      `<h1>${PELTILEIPA.title}</h1><p>${PELTILEIPA.servings}</p><ul>${PELTILEIPA.ingredients.map((line) => `<li>${line}</li>`).join('')}</ul>${PELTILEIPA.steps.map((line) => `<p>${line}</p>`).join('')}`,
    ),
  },
  '/puuttuu': { status: 404, body: page('', 'Sivua ei löytynyt') },
  '/estetty': { status: 403, body: page('', 'Forbidden') },
  // A check only a browser passes, as S-Kaupat sends it.
  '/tarkistus': {
    status: 429,
    headers: { 'x-vercel-mitigated': 'challenge' },
    body: page('', ''),
  },
  '/resepti.pdf': {
    status: 200,
    headers: { 'content-type': 'application/pdf' },
    body: '%PDF-1.4',
  },
}

createServer((request, response) => {
  const found = pages[request.url ?? '']
  if (!found) {
    response.writeHead(404).end()
    return
  }
  response
    .writeHead(found.status, {
      'content-type': 'text/html; charset=utf-8',
      ...found.headers,
    })
    .end(found.body)
}).listen(port, '127.0.0.1')

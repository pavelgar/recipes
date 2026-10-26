// Real pages for the importer's tests, as skeletons (corpus/AGENTS.md,
// "pages/"). Run with Bun, which resolves the app's @/ imports:
//
//   bun scripts/pages.ts collect <seed> [per site]
//   bun scripts/pages.ts skeletons
//   bun scripts/pages.ts check
//
// collect fetches pages of recipes already in corpus/ingredients/, as the
// importer fetches them, into .cache/pages/, which stays out of the repo.
// skeletons writes corpus/pages/ from that cache: each page's JSON-LD and
// the facts its head gives, with every string the repo doesn't already
// hold masked. check reads every skeleton and its cached page with the
// importer, and lists those that read differently, apart from the masked
// text.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DomUtils, parseDocument } from 'htmlparser2'
import { extractRecipe } from '@/lib/import/extract'
import { fetchPage } from '@/lib/import/fetch.server'

type CorpusFile = {
  site: string
  recipes: Array<{
    url: string
    name?: string
    ingredients?: Array<string>
    recipeCategory?: string | Array<string>
    recipeCuisine?: string | Array<string>
    keywords?: string | Array<string>
  }>
}

const CACHE = '.cache/pages'
const PAGES = 'corpus/pages'
const USER_AGENT = 'Recipes'
const DELAY_MS = 1500

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T
const corpusFiles = (folder: string) =>
  readdirSync(folder)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson<CorpusFile>(join(folder, name)))

// --- collect ---

// mulberry32, seeded, so the same seed picks the same pages.
function shuffled<T>(items: Array<T>, seed: number): Array<T> {
  let state = seed
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

type Robots = { allows: (path: string) => boolean; delayMs: number }

// The rules of the group for our user agent, or for every agent: the
// longest matching Allow or Disallow wins, * matches anything and $ ends.
async function robotsOf(origin: string): Promise<Robots> {
  const response = await fetch(`${origin}/robots.txt`, {
    headers: { 'user-agent': USER_AGENT },
  })
  const text = response.ok ? await response.text() : ''
  const groups: Array<{
    agents: Array<string>
    lines: Array<[string, string]>
  }> = []
  let current: (typeof groups)[number] | null = null
  let lastWasAgent = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const match = /^([\w-]+)\s*:\s*(.*)$/.exec(line)
    if (!match) continue
    const [, field, value] = match
    if (field.toLowerCase() === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], lines: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      current?.lines.push([field.toLowerCase(), value])
    }
  }
  const group =
    groups.find((g) => g.agents.includes(USER_AGENT.toLowerCase())) ??
    groups.find((g) => g.agents.includes('*'))
  const rules = (group?.lines ?? []).filter(
    ([field, value]) => (field === 'allow' || field === 'disallow') && value,
  )
  const delay = group?.lines.find(([field]) => field === 'crawl-delay')
  const pattern = (value: string) =>
    new RegExp(
      `^${value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}`,
    )
  return {
    allows: (path) => {
      let best: [string, string] | null = null
      for (const rule of rules) {
        if (
          pattern(rule[1]).test(path) &&
          rule[1].length > (best?.[1].length ?? -1)
        ) {
          best = rule
        }
      }
      return best === null || best[0] === 'allow'
    },
    delayMs: Math.max(DELAY_MS, Number(delay?.[1] ?? 0) * 1000),
  }
}

const slugOf = (url: string) =>
  new URL(url).pathname
    .replace(/^\/|\/$/g, '')
    .replace(/[^\w-]+/g, '-')
    .slice(-80) || 'index'

async function collect(seed: number, perSite: number) {
  const files = corpusFiles('corpus/ingredients')
  await Promise.all(
    files.map(async (file) => {
      const urls = shuffled(file.recipes.map((r) => r.url).sort(), seed)
      const robots = await robotsOf(new URL(urls[0]).origin)
      const dir = join(CACHE, file.site)
      mkdirSync(dir, { recursive: true })
      let saved = 0
      for (const url of urls) {
        if (saved === perSite) break
        if (!robots.allows(new URL(url).pathname)) {
          console.log(`${file.site}: robots.txt disallows ${url}`)
          continue
        }
        await new Promise((resolve) => setTimeout(resolve, robots.delayMs))
        const page = await fetchPage(url)
        if (!page.ok) {
          console.log(`${file.site}: ${page.error.code} ${url}`)
          continue
        }
        const collected = new Date().toISOString().slice(0, 10)
        writeFileSync(
          join(dir, `${slugOf(url)}.html`),
          `<!-- ${url} collected ${collected} -->\n${page.html}`,
        )
        saved++
      }
      console.log(`${file.site}: ${saved} pages`)
    }),
  )
}

// --- skeletons ---

// Properties whose strings are facts, not anyone's writing: types,
// addresses, times, yields, dates, codes and counts.
const FACTS = new Set([
  '@context',
  '@id',
  '@language',
  '@type',
  'type',
  'url',
  'image',
  'contentUrl',
  'thumbnailUrl',
  'embedUrl',
  'logo',
  'sameAs',
  'mainEntityOfPage',
  'inLanguage',
  'prepTime',
  'cookTime',
  'totalTime',
  'performTime',
  'duration',
  'datePublished',
  'dateModified',
  'dateCreated',
  'uploadDate',
  'recipeYield',
  'yield',
  'ratingValue',
  'ratingCount',
  'reviewCount',
  'bestRating',
  'worstRating',
  'width',
  'height',
  'encodingFormat',
  'servingSize',
  'calories',
])

const ORGANIZATIONS = new Set([
  'Organization',
  'Corporation',
  'NewsMediaOrganization',
  'WebSite',
  'Brand',
])

// Letters become x, keeping their case; digits, spaces, punctuation, tags
// and entities stay, since the importer reads them. So does the page's own
// recipe name, which kotiliesi.fi starts its method with: the importer
// drops that line.
function mask(text: string, keep: ReadonlyArray<string> = []): string {
  const phrases = keep
    .filter(Boolean)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const kept = phrases.length > 0 ? `|${phrases.join('|')}` : ''
  return text
    .split(new RegExp(`(<[^>]*>|&#?\\w+;${kept})`, 'i'))
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/\p{L}/gu, (c) => (c === c.toLowerCase() ? 'x' : 'X')),
    )
    .join('')
}

// The JSON-LD as published, broken JSON too, with each string value masked
// unless it's a fact or a string the corpus holds. Strings are found by a
// scan, not by parsing, so JSON that doesn't parse keeps its mistake.
function skeletonJson(
  text: string,
  known: Set<string>,
  keep: ReadonlyArray<string>,
): string {
  type Open = {
    kind: 'object' | 'array'
    property: string | null
    key: string | null
    types: Array<string>
  }
  const stack: Array<Open> = []
  const property = () => {
    const top = stack.at(-1)
    return top ? (top.kind === 'object' ? top.key : top.property) : null
  }
  return text.replace(
    /"(?:[^"\\]|\\.)*"(?=(\s*:)?)|[{}[\]]/g,
    (token, colon: string | undefined) => {
      if (token === '{' || token === '[') {
        stack.push({
          kind: token === '{' ? 'object' : 'array',
          property: property(),
          key: null,
          types: [],
        })
        return token
      }
      if (token === '}' || token === ']') {
        stack.pop()
        return token
      }
      let value: string
      try {
        value = JSON.parse(token) as string
      } catch {
        return token
      }
      const top = stack.at(-1)
      if (colon !== undefined && top?.kind === 'object') {
        top.key = value
        return token
      }
      const name = property()
      // An item's type, which JSON-LD gives before its other properties.
      const item = [...stack].reverse().find((open) => open.kind === 'object')
      if ((name === '@type' || name === 'type') && item) item.types.push(value)
      const fact =
        (name !== null && FACTS.has(name)) ||
        /^https?:\/\/\S+$/.test(value) ||
        // Whose site it is: the importer's source when the page has no
        // og:site_name.
        (name === 'name' &&
          item !== undefined &&
          (item.property === 'publisher' ||
            item.types.some((type) =>
              ORGANIZATIONS.has(type.replace(/^.*[/:]/, '')),
            )))
      if (fact || known.has(value)) return token
      return JSON.stringify(mask(value, keep))
    },
  )
}

function skeletons() {
  // Strings the repo holds already: the development corpus's ingredient
  // lines, names and tags, as published.
  const known = new Set<string>()
  const names = new Map<string, string>()
  const add = (value: unknown) => {
    if (typeof value === 'string') known.add(value)
    if (Array.isArray(value)) value.forEach(add)
  }
  for (const folder of ['corpus/ingredients', 'corpus/tags']) {
    for (const file of corpusFiles(folder)) {
      known.add(file.site)
      for (const r of file.recipes) {
        ;[
          r.name,
          r.ingredients,
          r.recipeCategory,
          r.recipeCuisine,
          r.keywords,
        ].forEach(add)
        if (r.name) names.set(r.url, r.name)
      }
    }
  }

  for (const site of readdirSync(CACHE)) {
    const out = join(PAGES, site)
    mkdirSync(out, { recursive: true })
    for (const name of readdirSync(join(CACHE, site))) {
      const source = readFileSync(join(CACHE, site, name), 'utf8')
      const [, header = '', url = ''] = /^(<!-- (\S+).*?-->)/.exec(source) ?? []
      const keep = [names.get(url) ?? '']
      const page = parseDocument(source)
      const element = (
        test: (e: ReturnType<typeof DomUtils.findAll>[number]) => boolean,
      ) => DomUtils.findOne(test, page.children)
      const attr = (e: ReturnType<typeof element>, a: string) =>
        e ? DomUtils.getAttributeValue(e, a) : undefined
      const escape = (text: string) =>
        text
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')

      const lang = attr(
        element((e) => e.name === 'html'),
        'lang',
      )
      const meta = (property: string) =>
        attr(
          element(
            (e) =>
              e.name === 'meta' &&
              (attr(e, 'property') === property ||
                attr(e, 'name') === property),
          ),
          'content',
        )
      const siteName = meta('og:site_name')
      const title = meta('og:title')
      const canonical = attr(
        element(
          (e) =>
            e.name === 'link' && attr(e, 'rel')?.toLowerCase() === 'canonical',
        ),
        'href',
      )
      const scripts = DomUtils.findAll(
        (e) =>
          e.name === 'script' &&
          DomUtils.getAttributeValue(e, 'type')?.trim().toLowerCase() ===
            'application/ld+json',
        page.children,
      )
      const head = [
        // The site's name is a fact; a title the corpus doesn't hold isn't.
        siteName !== undefined &&
          `<meta property="og:site_name" content="${escape(siteName)}">`,
        title !== undefined &&
          `<meta property="og:title" content="${escape(known.has(title) ? title : mask(title, keep))}">`,
        canonical !== undefined &&
          `<link rel="canonical" href="${escape(canonical)}">`,
        ...scripts.map(
          (script) =>
            `<script type="${escape(DomUtils.getAttributeValue(script, 'type') ?? '')}">${skeletonJson(DomUtils.textContent(script), known, keep)}</script>`,
        ),
      ].filter(Boolean)
      const html = `${header}\n<!doctype html>\n<html${lang === undefined ? '' : ` lang="${escape(lang)}"`}>\n<head>\n${head.join('\n')}\n</head>\n<body></body>\n</html>\n`
      writeFileSync(join(out, name), html)
    }
    console.log(`${site}: ${readdirSync(out).length} skeletons`)
  }
}

// --- check ---

function check() {
  // What the importer reads, apart from the text that skeletons mask.
  const shape = (html: string, url: string) => {
    const read = extractRecipe(html, url)
    return JSON.stringify(
      read && {
        ...read,
        steps: read.steps.map((section) => [
          section.heading !== null,
          section.lines.length,
        ]),
      },
    )
  }
  let same = 0
  for (const site of readdirSync(CACHE)) {
    for (const name of readdirSync(join(CACHE, site))) {
      const page = readFileSync(join(CACHE, site, name), 'utf8')
      const url = /^<!-- (\S+)/.exec(page)?.[1] ?? ''
      const skeleton = readFileSync(join(PAGES, site, name), 'utf8')
      const [a, b] = [shape(page, url), shape(skeleton, url)]
      if (a === b) same++
      else console.log(`${site}/${name}\n  page:     ${a}\n  skeleton: ${b}`)
    }
  }
  console.log(`${same} skeletons read as their pages do`)
}

const [command, ...args] = process.argv.slice(2)
if (command === 'collect') {
  const seed = Number(args[0])
  if (!Number.isInteger(seed)) throw new Error('collect needs a seed')
  await collect(seed, Number(args[1] ?? 3))
} else if (command === 'skeletons') {
  skeletons()
} else if (command === 'check') {
  check()
} else {
  throw new Error('Run with collect <seed> [per site], skeletons or check')
}

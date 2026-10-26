import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { extractRecipe } from '@/lib/import/extract'
import { clean } from '@/lib/import/recipe'
import { withoutStepNumber } from '@/lib/import/step-number'
import { corpusRecipes, ingredientLines, stepSentences } from '@/test/corpus'
import type { Section } from '@/db/schema'

// Pages put together from every standard way schema.org lets a page publish
// a recipe, and the mistakes DESIGN.md says sites make: a stub Recipe
// before the full one, JSON-LD missing a comma, times written as text. The
// text is the development corpus's, so the pages hold nothing that isn't
// in the repo already. Whatever the form, the importer reads back the
// recipe the page was made from.

// Text that reads back as written: no markup, entities, runs of spaces or
// step numbers of its own, which the importer is right to change.
const plain = (text: string) =>
  text.trim() !== '' &&
  clean(text) === text &&
  withoutStepNumber(text) === text &&
  !/[<>&]/.test(text) &&
  !/[.!?]\s*\d{1,2}\.\s+\p{Lu}/u.test(text)

const recipes = corpusRecipes
  .map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.filter(plain),
  }))
  .filter((recipe) => plain(recipe.title) && recipe.ingredients.length >= 2)
const sentences = stepSentences.map((line) => line.text).filter(plain)
// Lines the corpus publishes as headings ("Etikkaliemi:"), as a section's
// name.
const headings = [
  ...new Set(
    ingredientLines
      .map((line) => /^\s*([\p{L} ]{3,30}):\s*$/u.exec(line.text)?.[1])
      .filter((heading) => heading !== undefined)
      .map((heading) => heading.trim()),
  ),
]

type Recipe = {
  title: string
  lang: string
  ingredients: Array<string>
  sections: Array<Section>
  servings: { count: number; word: string | null } | null
  prep: number | null
  cook: number | null
  total: number | null
}

const minutes = fc.option(fc.integer({ min: 1, max: 600 }), { nil: null })

// Steps in sections, where no two sections without a heading meet: the
// importer can't tell them apart.
const sectionsOf = fc
  .array(
    fc.record({
      heading: fc.option(fc.constantFrom(...headings), { nil: null }),
      lines: fc.array(fc.constantFrom(...sentences), {
        minLength: 1,
        maxLength: 4,
      }),
    }),
    { minLength: 1, maxLength: 3 },
  )
  .filter((sections) =>
    sections.every(
      (s, i) => s.heading !== null || sections[i - 1]?.heading !== null,
    ),
  )

const recipe: fc.Arbitrary<Recipe> = fc
  .record({
    base: fc.constantFrom(...recipes),
    sections: sectionsOf,
    servings: fc.option(
      fc.record({
        count: fc.integer({ min: 1, max: 24 }),
        word: fc.option(fc.constantFrom('annosta', 'servings', 'pullaa'), {
          nil: null,
        }),
      }),
      { nil: null },
    ),
    prep: minutes,
    cook: minutes,
    total: minutes,
  })
  .filter(
    ({ base, sections }) =>
      sections[0].heading !== null ||
      sections[0].lines[0].toLowerCase() !== base.title.toLowerCase(),
  )
  .map(({ base, ...rest }) => ({
    title: base.title,
    lang: base.language,
    ingredients: base.ingredients,
    ...rest,
  }))

// How a page writes each part.
const form = fc.record({
  typeKey: fc.constantFrom('@type', 'type'),
  type: fc.constantFrom<unknown>(
    'Recipe',
    ['Recipe'],
    'schema:Recipe',
    'https://schema.org/Recipe',
    'http://schema.org/Recipe',
    ['Recipe', 'NewsArticle'],
  ),
  place: fc.constantFrom('alone', 'list', 'graph', 'mainEntity', 'microdata'),
  stub: fc.boolean(),
  ingredients: fc.constantFrom('list', 'legacy', 'lines', 'breaks'),
  steps: fc.constantFrom('text', 'texts', 'howTo', 'howToName', 'paragraphs'),
  time: fc.constantFrom('iso', 'isoDays', 'isoSeconds', 'text', 'textShort'),
  servings: fc.constantFrom('one', 'pair', 'number'),
  scriptType: fc.constantFrom(
    'application/ld+json',
    ' Application/LD+JSON ',
    'application/ld&#x2B;json',
  ),
  pretty: fc.boolean(),
  missingComma: fc.boolean(),
  source: fc.constantFrom('siteName', 'publisher', 'publisherRef'),
  canonical: fc.constantFrom('none', 'same', 'other'),
})
type Form = typeof form extends fc.Arbitrary<infer F> ? F : never

function writeTime(total: number, how: Form['time']): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  switch (how) {
    case 'iso':
      return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`
    case 'isoDays':
      return `P0DT${h}H${m}M`
    case 'isoSeconds':
      return `PT${total}M0S`
    case 'text':
      return [h && `${h} ${h === 1 ? 'hour' : 'hours'}`, m && `${m} minutes`]
        .filter(Boolean)
        .join(' ')
    case 'textShort':
      return `${total} min`
  }
}

function writeServings(
  servings: NonNullable<Recipe['servings']>,
  how: Form['servings'],
) {
  const text = servings.word
    ? `${servings.count} ${servings.word}`
    : `${servings.count}`
  if (how === 'number' && !servings.word) return servings.count
  if (how === 'pair' && servings.word) return [String(servings.count), text]
  return text
}

// The recipe's steps as JSON-LD's recipeInstructions.
function writeSteps(sections: Array<Section>, how: Form['steps']): unknown {
  const flat = sections.length === 1 && sections[0].heading === null
  const step = (text: string) =>
    how === 'howToName'
      ? { '@type': 'HowToStep', name: text }
      : { '@type': 'HowToStep', text }
  if (flat) {
    const lines = sections[0].lines
    switch (how) {
      case 'text':
        return lines.join('\n')
      case 'paragraphs':
        return lines.map((line) => `<p>${line}</p>`).join('')
      case 'texts':
        return lines
      default:
        return lines.map(step)
    }
  }
  return sections.flatMap((section) =>
    section.heading === null
      ? section.lines.map(step)
      : [
          {
            '@type': 'HowToSection',
            name: section.heading,
            itemListElement: section.lines.map(step),
          },
        ],
  )
}

const PAGE_URL = 'https://www.esimerkki.fi/reseptit/resepti?utm_source=x'
const SITE_NAME = 'Esimerkki'

function jsonLdRecipe(r: Recipe, f: Form): Record<string, unknown> {
  const time = (value: number | null) =>
    value === null ? undefined : writeTime(value, f.time)
  return {
    '@context': 'https://schema.org',
    [f.typeKey]: f.type,
    name: r.title,
    ...(r.servings && { recipeYield: writeServings(r.servings, f.servings) }),
    prepTime: time(r.prep),
    cookTime: time(r.cook),
    totalTime: time(r.total),
    ...(f.ingredients === 'legacy'
      ? { ingredients: r.ingredients }
      : f.ingredients === 'lines'
        ? { recipeIngredient: r.ingredients.join('\n') }
        : f.ingredients === 'breaks'
          ? { recipeIngredient: r.ingredients.join('<br>') }
          : { recipeIngredient: r.ingredients }),
    recipeInstructions: writeSteps(r.sections, f.steps),
    ...(f.source === 'publisher' && {
      publisher: { '@type': 'Organization', name: SITE_NAME },
    }),
    ...(f.source === 'publisherRef' && {
      publisher: { '@id': 'https://www.esimerkki.fi/#organization' },
    }),
  }
}

// A stub as jalotofu.fi's rating plugin writes it: a name and a rating.
const stubOf = (r: Recipe) => ({
  '@context': 'https://schema.org',
  '@type': 'Recipe',
  name: r.title,
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.5' },
})

function jsonLdScripts(r: Recipe, f: Form): string {
  const full = jsonLdRecipe(r, f)
  const organization = {
    '@type': 'Organization',
    '@id': 'https://www.esimerkki.fi/#organization',
    name: SITE_NAME,
  }
  const data =
    f.place === 'list'
      ? [...(f.stub ? [stubOf(r)] : []), full]
      : f.place === 'graph'
        ? {
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': 'https://www.esimerkki.fi/#website',
              },
              organization,
              ...(f.stub ? [stubOf(r)] : []),
              full,
            ],
          }
        : f.place === 'mainEntity'
          ? {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              mainEntity: full,
            }
          : full
  const others: Array<unknown> = []
  // A stub on its own comes in a script before the recipe's.
  if (f.stub && (f.place === 'alone' || f.place === 'mainEntity')) {
    others.push(stubOf(r))
  }
  // A publisher by reference is found in another item of the data.
  if (f.source === 'publisherRef' && f.place !== 'graph') {
    return script(f, { '@graph': [organization, ...others, full] })
  }
  return [...others, data].map((value) => script(f, value)).join('')
}

function script(f: Form, data: unknown): string {
  let json = JSON.stringify(data, null, f.pretty ? 2 : undefined)
  // As three kotikokki.net pages publish it: a comma missing at a line
  // break, between two properties.
  if (f.pretty && f.missingComma) {
    json = json.replace(/,\n(\s*"recipeInstructions")/, '\n$1')
  }
  return `<script type="${f.scriptType}">${json}</script>`
}

// The same recipe as microdata.
function microdata(r: Recipe, f: Form): string {
  const time = (name: string, value: number | null) =>
    value === null
      ? ''
      : `<meta itemprop="${name}" content="${writeTime(value, f.time)}">`
  const step = (text: string) =>
    f.steps === 'texts' || f.steps === 'text'
      ? `<li itemprop="recipeInstructions">${text}</li>`
      : `<li itemprop="recipeInstructions" itemscope itemtype="https://schema.org/HowToStep"><span itemprop="text">${text}</span></li>`
  const sections = r.sections
    .map((section) =>
      section.heading === null
        ? section.lines.map(step).join('')
        : `<li itemprop="recipeInstructions" itemscope itemtype="https://schema.org/HowToSection"><h3 itemprop="name">${section.heading}</h3><ol>${section.lines
            .map(
              (line) =>
                `<li itemprop="itemListElement" itemscope itemtype="https://schema.org/HowToStep"><span itemprop="text">${line}</span></li>`,
            )
            .join('')}</ol></li>`,
    )
    .join('')
  const servings = r.servings
    ? `<span itemprop="recipeYield">${r.servings.word ? `${r.servings.count} ${r.servings.word}` : r.servings.count}</span>`
    : ''
  const publisher =
    f.source === 'siteName'
      ? ''
      : `<div itemprop="publisher" itemscope itemtype="https://schema.org/Organization"><span itemprop="name">${SITE_NAME}</span></div>`
  const stub = f.stub
    ? `<div itemscope itemtype="https://schema.org/Recipe"><span itemprop="name">${r.title}</span></div>`
    : ''
  return `${stub}<article itemscope itemtype="https://schema.org/Recipe">
    <h1 itemprop="name">${r.title}</h1>${servings}
    ${time('prepTime', r.prep)}${time('cookTime', r.cook)}${time('totalTime', r.total)}
    <ul>${r.ingredients.map((line) => `<li itemprop="recipeIngredient">${line}</li>`).join('')}</ul>
    <ol>${sections}</ol>${publisher}
  </article>`
}

function pageOf(r: Recipe, f: Form): string {
  const head = [
    f.source === 'siteName' &&
      `<meta property="og:site_name" content="${SITE_NAME}">`,
    f.canonical === 'same' &&
      '<link rel="canonical" href="https://www.esimerkki.fi/reseptit/resepti">',
    f.canonical === 'other' &&
      '<link rel="canonical" href="https://muualla.fi/reseptit/resepti">',
    f.place === 'microdata' ? '' : jsonLdScripts(r, f),
  ]
    .filter(Boolean)
    .join('')
  const body = f.place === 'microdata' ? microdata(r, f) : '<main></main>'
  return `<!doctype html><html lang="${r.lang}"><head>${head}</head><body>${body}</body></html>`
}

// What the importer should make of the page.
function expected(r: Recipe, f: Form) {
  return {
    title: r.title,
    servings: r.servings
      ? r.servings.word
        ? `${r.servings.count} ${r.servings.word}`
        : String(r.servings.count)
      : null,
    prepMinutes: r.prep,
    cookMinutes: r.cook,
    totalMinutes: r.total,
    ingredients: [{ heading: null, lines: r.ingredients }],
    steps: r.sections,
    sourceName: SITE_NAME,
    sourceUrl:
      f.canonical === 'same'
        ? 'https://www.esimerkki.fi/reseptit/resepti'
        : PAGE_URL,
  }
}

describe('a page with a recipe', () => {
  test.prop([recipe, form], { numRuns: 300 })(
    'reads back the recipe it was made from, however the page writes it',
    (r, f) => {
      const read = extractRecipe(pageOf(r, f), PAGE_URL)
      expect(read).toMatchObject(expected(r, f))
    },
  )
})

describe('any JSON-LD', () => {
  // JSON-LD whose shape no site publishes, a Recipe somewhere in it: the
  // importer finds a recipe or none, and never fails.
  const anything = fc.letrec((tie) => ({
    value: fc.oneof(
      { depthSize: 'small' },
      fc.jsonValue({ maxDepth: 1 }),
      fc.array(tie('value'), { maxLength: 4 }),
      fc.dictionary(
        fc.constantFrom(
          '@type',
          '@id',
          '@graph',
          'name',
          'recipeIngredient',
          'recipeInstructions',
          'itemListElement',
          'text',
          'recipeYield',
          'totalTime',
          'mainEntity',
          'publisher',
        ),
        fc.oneof(
          tie('value'),
          fc.constantFrom('Recipe', 'HowToSection', 'HowToStep', ['Recipe']),
        ),
        { maxKeys: 6 },
      ),
    ),
  }))

  test.prop([anything.value], { numRuns: 1000 })('never fails', (data) => {
    const html = `<script type="application/ld+json">${JSON.stringify(data)}</script>`
    const read = extractRecipe(html, PAGE_URL)
    if (read) {
      expect(read.title).toEqual(expect.any(String))
      expect(read.steps.every((section) => section.lines.length > 0)).toBe(true)
    }
  })

  test.prop([fc.string({ maxLength: 200 })], { numRuns: 1000 })(
    'never fails on text that is not JSON',
    (text) => {
      expect(() =>
        extractRecipe(
          `<script type="application/ld+json">${text}</script>`,
          PAGE_URL,
        ),
      ).not.toThrow()
    },
  )
})

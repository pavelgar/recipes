import { decodeHTML } from 'entities'
import { DomUtils } from 'htmlparser2'
import { siteOf } from '@/lib/import/link'
import { isOfType, isThing, valuesOf } from '@/lib/import/schema-org'
import { guessMeasuringSystem } from '@/lib/measuring-system'
import type { Section } from '@/db/schema'
import type { ImportedRecipe } from '@/lib/import/types'
import type { Page, Thing } from '@/lib/import/schema-org'
import type { Language } from '@/lib/quantities'

// Reads a schema.org Recipe, from JSON-LD or microdata, into what the app
// keeps. A recipe needs ingredients or steps; without either, the page
// has none worth importing.
export function readRecipe(
  recipe: Thing,
  {
    page,
    pageUrl,
    resolve = (value) => value,
  }: { page: Page; pageUrl: string; resolve?: (value: unknown) => unknown },
): ImportedRecipe | null {
  const ingredients = [
    ...valuesOf(recipe, 'recipeIngredient'),
    ...valuesOf(recipe, 'ingredients'),
  ].flatMap((value) => (typeof value === 'string' ? lines(value) : []))
  const title =
    firstText(valuesOf(recipe, 'name')) ?? metaContent(page, 'og:title')
  const steps = withoutTitle(
    readSteps(valuesOf(recipe, 'recipeInstructions'), resolve),
    title,
  )
  if (ingredients.length === 0 && steps.length === 0) return null

  const host = siteOf(pageUrl)
  const language =
    languageOf(firstText(valuesOf(recipe, 'inLanguage'))) ??
    languageOf(htmlLang(page)) ??
    (host.endsWith('.fi') ? 'fi' : 'en')

  return {
    title: title ?? host,
    language,
    measuringSystem: guessMeasuringSystem(host, language),
    servings: readServings([
      ...valuesOf(recipe, 'recipeYield'),
      ...valuesOf(recipe, 'yield'),
    ]),
    prepMinutes: readMinutes(valuesOf(recipe, 'prepTime')),
    cookMinutes: readMinutes(valuesOf(recipe, 'cookTime')),
    totalMinutes: readMinutes(valuesOf(recipe, 'totalTime')),
    ingredients:
      ingredients.length > 0 ? [{ heading: null, lines: ingredients }] : [],
    steps,
    sourceName:
      metaContent(page, 'og:site_name') ?? publisherName(recipe, resolve),
    sourceUrl: canonicalUrl(page, pageUrl),
  }
}

// Text as the page published it, readable: HTML entities decoded (pages
// write "Salt &amp; pepper"), stray tags dropped and runs of spaces made
// single.
export function clean(text: string): string {
  const withoutTags = (value: string) => value.replace(/<\/?[a-z][^>]*>/gi, ' ')
  return withoutTags(decodeHTML(withoutTags(text)))
    .replace(/\s+/g, ' ')
    .trim()
}

// One string may hold several lines, separated by line breaks or by HTML
// that breaks lines.
function lines(text: string): Array<string> {
  return text
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/gi, '\n')
    .split(/\r?\n/)
    .map(clean)
    .filter((line) => line !== '')
}

// The first value written as text, as written.
function firstString(values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return null
}

function firstText(values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = clean(String(value))
      if (text !== '') return text
    }
  }
  return null
}

// Steps come as one text, a list of texts, HowToSteps, or HowToSections of
// HowToSteps. A section's name becomes the heading of its steps. arla.fi
// writes "type" for "@type", and puts its whole method in one HowToStep
// whose paragraphs are the steps.
function readSteps(
  values: Array<unknown>,
  resolve: (value: unknown) => unknown,
): Array<Section> {
  const sections: Array<{ heading: string | null; lines: Array<string> }> = [
    { heading: null, lines: [] },
  ]
  const visit = (value: unknown, depth: number) => {
    if (depth > 6) return
    const resolved = resolve(value)
    if (typeof resolved === 'string') {
      sections[sections.length - 1].lines.push(...numberedSteps(resolved))
    } else if (Array.isArray(resolved)) {
      for (const item of resolved) visit(item, depth + 1)
    } else if (isThing(resolved)) {
      if (isOfType(resolved, 'HowToSection')) {
        sections.push({
          heading: firstText(valuesOf(resolved, 'name')),
          lines: [],
        })
        visit(resolved.itemListElement, depth + 1)
        // Steps after a section belong to no section.
        sections.push({ heading: null, lines: [] })
      } else if (resolved.itemListElement !== undefined) {
        visit(resolved.itemListElement, depth + 1)
      } else {
        const text =
          firstString(valuesOf(resolved, 'text')) ??
          firstString(valuesOf(resolved, 'name'))
        if (text !== null) visit(text, depth + 1)
      }
    }
  }
  for (const value of values) visit(value, 0)
  return sections.filter((section) => section.lines.length > 0)
}

// The steps in a text, one per line. kotiliesi.fi runs numbered steps
// together in one line ("…sitruunan kuorella.2. Vuoraa leivinpelti…").
// The app numbers steps itself, so their own numbers go.
function numberedSteps(text: string): Array<string> {
  return lines(text)
    .flatMap((line) => line.split(/(?<=[.!?])\s*(?=\d{1,2}\.\s+\p{Lu})/u))
    .map((line) => line.replace(/^\d{1,2}\.\s+(?=\p{Lu})/u, '').trim())
    .filter((line) => line !== '')
}

// kotiliesi.fi starts its method with the recipe's name.
function withoutTitle(
  steps: Array<Section>,
  title: string | null,
): Array<Section> {
  if (steps.length === 0 || !title) return steps
  const [first, ...rest] = steps
  if (first.lines[0]?.toLowerCase() !== title.toLowerCase()) return steps
  const remaining = { ...first, lines: first.lines.slice(1) }
  return remaining.lines.length > 0 ? [remaining, ...rest] : rest
}

// Pages often give servings and yield together: ["12", "12 doughnuts"].
// The one with words says more, and keeps them: "24 pullaa".
function readServings(values: Array<unknown>): string | null {
  const texts = values
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map((value) => clean(String(value)))
    .filter((text) => text !== '')
  return texts.find((text) => /\p{L}/u.test(text)) ?? texts.at(0) ?? null
}

// ISO 8601 durations, as schema.org asks: "PT1H30M" is 90 minutes. Zero
// and other forms are taken as not given.
export function readMinutes(values: Array<unknown>): number | null {
  const text = firstText(values)
  const match =
    text &&
    /^P(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i.exec(
      text,
    )
  if (!match) return null
  const [days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => (part ? Number(part.replace(',', '.')) : 0))
  const total = Math.round(days * 24 * 60 + hours * 60 + minutes + seconds / 60)
  return total > 0 ? total : null
}

function publisherName(
  recipe: Thing,
  resolve: (value: unknown) => unknown,
): string | null {
  for (const value of valuesOf(recipe, 'publisher')) {
    const publisher = resolve(value)
    if (isThing(publisher)) {
      const name = firstText(valuesOf(publisher, 'name'))
      if (name) return name
    }
  }
  return null
}

// The address the site gives as the page's own, which leaves out tracking
// parameters, if it's on the same site. Otherwise the address read.
function canonicalUrl(page: Page, pageUrl: string): string {
  const link = DomUtils.findOne(
    (element) =>
      element.name === 'link' &&
      DomUtils.getAttributeValue(element, 'rel')?.toLowerCase() === 'canonical',
    page.children,
  )
  const href = link && DomUtils.getAttributeValue(link, 'href')
  if (href && URL.canParse(href, pageUrl)) {
    const canonical = new URL(href, pageUrl)
    if (canonical.hostname === new URL(pageUrl).hostname) return canonical.href
  }
  return pageUrl
}

function metaContent(page: Page, property: string): string | null {
  const meta = DomUtils.findOne(
    (element) =>
      element.name === 'meta' &&
      (DomUtils.getAttributeValue(element, 'property') === property ||
        DomUtils.getAttributeValue(element, 'name') === property),
    page.children,
  )
  const content = meta && DomUtils.getAttributeValue(meta, 'content')
  return content ? clean(content) || null : null
}

function htmlLang(page: Page): string | null {
  const html = DomUtils.findOne(
    (element) => element.name === 'html',
    page.children,
    false,
  )
  return (html && DomUtils.getAttributeValue(html, 'lang')) ?? null
}

// "fi", "fi-FI" and "en-GB" name a language the app reads; others don't.
function languageOf(tag: string | null): Language | null {
  const primary = tag?.trim().toLowerCase().split(/[-_]/)[0]
  return primary === 'fi' || primary === 'en' ? primary : null
}

import { withoutStepNumber } from '@/core/import/step-number'
import { decodeHTML } from 'entities'
import { DomUtils } from 'htmlparser2'
import { siteOf } from '@/core/import/link'
import { recipeLanguageOf, regionOf } from '@/core/languages'
import { recipeLanguage } from '@/core/languages.server'
import { isOfType, isThing, valuesOf } from '@/core/import/schema-org'
import { guessMeasuringSystem } from '@/core/measuring-system'
import type { Section } from '@/core/recipe/section'
import type { ImportedRecipe } from '@/core/import/types'
import type { Page, Thing } from '@/core/import/schema-org'

// Reads a schema.org Recipe, from JSON-LD or microdata, into what the app
// keeps. A recipe needs steps or more than one ingredient; otherwise the
// page has none worth importing. olivemagazine.com marks its collection
// pages as a Recipe whose one ingredient is a list of keywords ("chicken,
// chicken breasts, chicken thighs…") and which has no steps.
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
  if (steps.length === 0 && ingredients.length <= 1) return null

  const host = siteOf(pageUrl)
  // The language tag the page states: the Recipe's own, then the page's.
  const stated =
    [firstText(valuesOf(recipe, 'inLanguage')), htmlLang(page)].find(
      (tag) => recipeLanguageOf(tag) !== null,
    ) ?? null
  const language = recipeLanguage(
    [title, ...ingredients, ...steps.flatMap(sectionText)]
      .filter((text) => text !== null)
      .join('\n'),
    recipeLanguageOf(stated),
  )
  // The region it states ("en-GB") goes with the language it states, so it
  // doesn't count where the text overrules the page.
  const region = recipeLanguageOf(stated) === language ? regionOf(stated) : null

  return {
    title: title ?? host,
    language,
    measuringSystem: guessMeasuringSystem(host, language, region),
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
    imageUrl: readImage(valuesOf(recipe, 'image'), resolve, pageUrl),
  }
}

// What a page says about itself, apart from any Recipe in it: the language
// it states, its site's name, its title and its own address. For a page
// read with AI.
export function pageFacts(page: Page, pageUrl: string) {
  return {
    lang: htmlLang(page),
    siteName: metaContent(page, 'og:site_name'),
    title: metaContent(page, 'og:title'),
    url: canonicalUrl(page, pageUrl),
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
// that breaks lines. meillakotona.fi breaks its steps with a carriage
// return alone.
function lines(text: string): Array<string> {
  return text
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\b[^>]*>/gi, '\n')
    .split(/\r\n?|\n/)
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
    .map((line) => withoutStepNumber(line).trim())
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

// ISO 8601 durations, as schema.org asks: "PT1H30M" is 90 minutes. Some
// sites write the time as text instead: "10 min" (jalotofu.fi), "30m"
// (hellofresh.co.uk), "1 hour 15 minutes" (epicurious.com). A note after
// a comma or in parentheses is left out: "30 minutes, plus cooling". Zero
// and other forms, ranges among them, are taken as not given.
export function readMinutes(values: Array<unknown>): number | null {
  const text = firstText(values)
  const total = text === null ? null : (isoMinutes(text) ?? textMinutes(text))
  return total !== null && total > 0 ? Math.round(total) : null
}

function isoMinutes(text: string): number | null {
  const match =
    /^P(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i.exec(
      text,
    )
  if (!match) return null
  const [days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => (part ? decimal(part) : 0))
  return days * 24 * 60 + hours * 60 + minutes + seconds / 60
}

// Minutes in each unit of a time written as text.
const UNIT_MINUTES: Readonly<Partial<Record<string, number>>> = {
  d: 24 * 60,
  day: 24 * 60,
  days: 24 * 60,
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60,
  m: 1,
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
  s: 1 / 60,
  sec: 1 / 60,
  secs: 1 / 60,
  second: 1 / 60,
  seconds: 1 / 60,
}

// A time as amounts of units, "1 hour 15 minutes", or null. A decimal
// comma ("1,5 h") isn't a note's comma, which a space follows.
function textMinutes(text: string): number | null {
  const [time] = text.split(/\s*(?:\(|,\s)/, 1)
  if (!/^(?:\d+(?:[.,]\d+)?\s*\p{L}+\s*)+$/u.test(time)) return null
  let total = 0
  for (const [, amount, unit] of time.matchAll(
    /(\d+(?:[.,]\d+)?)\s*(\p{L}+)/gu,
  )) {
    const minutes = UNIT_MINUTES[unit.toLowerCase()]
    if (minutes === undefined) return null
    total += decimal(amount) * minutes
  }
  return total
}

function decimal(text: string): number {
  return Number(text.replace(',', '.'))
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

// The recipe's photo: of the images its data gives, the one with the
// largest stated width, otherwise the first listed. Sites often list one
// photo in several sizes or crops: BBC Good Food and Yhteishyvä a smaller
// one first, WP Recipe Maker the full photo first, then square, 4:3 and
// 16:9 crops. Valio and Meillä kotona list their crops square first, with
// no sizes or one width for all, so the square comes. The page's og:image
// isn't read: for a recipe without a photo, BBC Food's is its logo.
function readImage(
  values: Array<unknown>,
  resolve: (value: unknown) => unknown,
  pageUrl: string,
): string | null {
  let chosen: { url: string; width: number } | null = null
  for (const value of values) {
    const image = imageOf(resolve(value))
    const url = image && webAddress(image.url, pageUrl)
    if (!url) continue
    const width = image.width ?? 0
    if (!chosen || width > chosen.width) chosen = { url, width }
  }
  return chosen?.url ?? null
}

// An image as an address, or as an ImageObject with its address and,
// perhaps, its width. Microdata gives an <img>'s src as the address.
function imageOf(value: unknown): { url: string; width: number | null } | null {
  if (typeof value === 'string') return { url: value, width: null }
  if (!isThing(value)) return null
  const url =
    firstString(valuesOf(value, 'url')) ??
    firstString(valuesOf(value, 'contentUrl'))
  return url === null ? null : { url, width: pixels(valuesOf(value, 'width')) }
}

// A width in pixels: 1200, "1200", "1200px", or a QuantitativeValue.
function pixels(values: Array<unknown>): number | null {
  const [value] = values
  const width =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseInt(value, 10)
        : isThing(value)
          ? pixels(valuesOf(value, 'value'))
          : null
  return width !== null && Number.isFinite(width) && width > 0 ? width : null
}

// An address as written, made absolute against the page's, if it's a web
// address.
function webAddress(text: string, pageUrl: string): string | null {
  if (!URL.canParse(text.trim(), pageUrl)) return null
  const url = new URL(text.trim(), pageUrl)
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
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

function sectionText(section: Section): Array<string | null> {
  return [section.heading, ...section.lines]
}

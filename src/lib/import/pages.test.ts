import { describe, expect, it } from 'vitest'
import { extractRecipe } from '@/lib/import/extract'
import { clean } from '@/lib/import/recipe'
import { siteOf } from '@/lib/import/link'
import { corpusRecipes } from '@/test/corpus'
import { assertLedger, checkLedger } from '@/test/ledger'
import type { ImportedRecipe } from '@/lib/import/types'

// Skeletons of real pages (corpus/AGENTS.md, "pages/"): their JSON-LD as
// the sites publish it, with the writing that isn't already in the repo
// masked. The importer reads them as it reads the pages.

const files = import.meta.glob<string>('/corpus/pages/*/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const pages = Object.entries(files).map(([path, html]) => {
  const url = /^<!-- (\S+) collected /.exec(html)?.[1]
  if (!url) throw new Error(`${path} doesn't start with its address`)
  const recipe = corpusRecipes.find((r) => r.url === url)
  if (!recipe) throw new Error(`${path} is of no recipe in corpus/ingredients/`)
  return { path, url, html, recipe, read: extractRecipe(html, url) }
})

const sectionsOf = (sections: ImportedRecipe['steps']) =>
  sections.length === 1 && sections[0].heading === null
    ? '1 section'
    : `${sections.length} sections${sections.some((s) => s.heading === null) ? ', some without a heading' : ''}`

// One line each for what a reader of the page can check against it.
function describePage(read: ImportedRecipe | null, url: string): Array<string> {
  if (!read) return ['no recipe']
  const minutes = (n: number | null) => (n === null ? '–' : String(n))
  const lineCount = (sections: ImportedRecipe['steps']) =>
    sections.reduce((n, s) => n + s.lines.length, 0)
  return [
    `servings ${read.servings ?? '–'} | prep ${minutes(read.prepMinutes)} | cook ${minutes(read.cookMinutes)} | total ${minutes(read.totalMinutes)}`,
    `ingredients ${lineCount(read.ingredients)} in ${sectionsOf(read.ingredients)}`,
    `steps ${lineCount(read.steps)} in ${sectionsOf(read.steps)}`,
    `${read.language}, ${read.measuringSystem}`,
    `source ${read.sourceName ?? '–'}, ${read.sourceUrl === url ? 'at the address read' : `at ${read.sourceUrl}`}`,
  ]
}

describe('every page', () => {
  it.each(pages.map((page) => [page.path, page] as const))(
    '%s gives the recipe the corpus has',
    (_, { read, recipe }) => {
      expect(read).not.toBeNull()
      expect(read?.title).toBe(clean(recipe.title))
      expect(read?.ingredients.flatMap((s) => s.lines)).toEqual(
        recipe.ingredients.map(clean).filter((line) => line !== ''),
      )
    },
  )

  it('keeps its reading of every page', () => {
    const path = 'src/lib/import/__ledger__/pages.txt'
    const check = checkLedger({
      path,
      title: [
        'Every page in corpus/pages/ as extractRecipe reads it.',
        "✓: it is what DESIGN.md's import rules make of the page as published",
        '(.cache/pages/ holds it, or its address): servings and times, how',
        'many ingredients and steps in how many sections, language and',
        'measures, and whose page it is.',
        '✗: want lines give the right reading.',
        'Written by the tests; see src/test/ledger.ts for how to update it.',
      ],
      items: pages
        .sort((a, b) => a.url.localeCompare(b.url))
        .map((page) => ({
          group: siteOf(page.url),
          text: page.url,
          reading: describePage(page.read, page.url),
        })),
      summarise: (_, entries) => `: ${entries.length} pages`,
    })
    assertLedger(check, path, (message) => expect.fail(message))
  })
})

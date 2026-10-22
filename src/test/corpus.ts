import type { Language } from '@/lib/quantities/numbers'
import type { MeasuringSystem } from '@/lib/quantities/scan'

// Reads the real recipe data in corpus/ (see corpus/README.md) for tests.

type Country = 'FI' | 'US' | 'GB' | 'AU'

// rare-forms recipes may have only ingredients or only sentences.
type CorpusFile<T extends string> = {
  site: string
  country: Country
  language: Language
  recipes: Array<{ url: string } & Partial<Record<T, Array<string>>>>
}

const ingredientFiles = import.meta.glob<CorpusFile<'ingredients'>>(
  [
    '/corpus/ingredients/*.json',
    '/corpus/rare-units/*.json',
    '/corpus/rare-forms/*.json',
  ],
  { eager: true, import: 'default' },
)
const stepFiles = import.meta.glob<CorpusFile<'sentences'>>(
  ['/corpus/steps/*.json', '/corpus/rare-forms/*.json'],
  { eager: true, import: 'default' },
)

// The held-out sample (corpus/held-out/) is read only by held-out.test.ts,
// which runs on request. Don't use it while writing rules.
const heldOutFiles = import.meta.glob<CorpusFile<'ingredients' | 'sentences'>>(
  '/corpus/held-out/*.json',
  { eager: true, import: 'default' },
)

const SYSTEMS: Record<Country, MeasuringSystem> = {
  FI: 'metric',
  US: 'us',
  GB: 'british',
  AU: 'australian',
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  nbsp: ' ',
  deg: '°',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
}

// Sites publish some text with HTML entities. The importer decodes them
// before parsing; this stands in for it.
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z0-9]+);/gi, (m, name: string) => {
      return ENTITIES[name.toLowerCase()] ?? m
    })
}

export type CorpusLine = {
  site: string
  language: Language
  system: MeasuringSystem
  text: string
}

function lines<T extends string>(
  files: Record<string, CorpusFile<T>>,
  field: T,
): Array<CorpusLine> {
  return Object.values(files).flatMap((file) =>
    file.recipes.flatMap((recipe) =>
      (recipe[field] ?? []).map((raw) => ({
        site: file.site,
        language: file.language,
        system: SYSTEMS[file.country],
        text: decodeEntities(raw),
      })),
    ),
  )
}

export const ingredientLines = lines(ingredientFiles, 'ingredients')
export const stepSentences = lines(stepFiles, 'sentences')
export const heldOutIngredientLines = lines(heldOutFiles, 'ingredients')
export const heldOutStepSentences = lines(heldOutFiles, 'sentences')

export function inCorpus(corpus: Array<CorpusLine>, text: string): boolean {
  return corpus.some((line) => line.text === text)
}

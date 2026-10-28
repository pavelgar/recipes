import { withoutStepNumber } from '@/core/import/step-number'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { MEASURING_SYSTEMS } from '@/core/recipe/choices'
import { AI_MAX_OUTPUT_TOKENS, AI_TIMEOUT_MS } from '@/server/ai/model.server'
import { pageFacts } from '@/core/import/recipe'
import { sourceChecker } from '@/core/import/verbatim'
import {
  isRecipeLanguage,
  recipeLanguageOf,
  regionOf,
  UNKNOWN_LANGUAGE,
} from '@/core/languages'
import { recipeLanguage } from '@/server/languages.server'
import { guessMeasuringSystem } from '@/core/measuring-system'
import type { UserContent } from 'ai'
import type { Section } from '@/server/db/schema'
import type { AiModel } from '@/server/ai/model.server'
import type { Page } from '@/core/import/schema-org'
import type { AiImport } from '@/core/import/types'
import type { Checked } from '@/core/import/verbatim'
import type { RecipeLanguage } from '@/core/languages'

// What AI reads a recipe from: photos of it, the text of a page without
// Recipe data, or text someone pasted in.
export type RecipeSource =
  | {
      kind: 'photos'
      photos: ReadonlyArray<{ data: Uint8Array; mediaType: string }>
    }
  | { kind: 'page'; text: string; page: Page; pageUrl: string; site: string }
  | { kind: 'text'; text: string }

// Every field is there, null when the source doesn't say, as strict JSON
// schemas need: OpenAI's structured output rejects optional fields.
const sectionSchema = z.object({
  heading: z.string().nullable(),
  lines: z.array(z.string()),
})

const answerSchema = z.object({
  isRecipe: z.boolean(),
  title: z.string().nullable(),
  servings: z.string().nullable(),
  prepMinutes: z.number().nullable(),
  cookMinutes: z.number().nullable(),
  totalMinutes: z.number().nullable(),
  ingredients: z.array(sectionSchema),
  steps: z.array(sectionSchema),
  language: z.string().nullable(),
  measures: z.enum(MEASURING_SYSTEMS).nullable(),
})

export type Answer = z.infer<typeof answerSchema>

const SOURCES: Record<RecipeSource['kind'], string> = {
  photos:
    'photos of one recipe: a cookbook page, a recipe over several pages in the order given, a handwritten card or a screenshot. Read printed and handwritten text alike; where handwriting is hard to make out, give your best reading of it.',
  page: 'the text of a web page. It holds the whole page, which may include menus, comments, adverts and other recipes: take only the main recipe.',
  text: 'text someone pasted in, such as a recipe sent in a message.',
}

// The rules the brief sets: copied as written, nothing added. The examples
// are Finnish and English, the languages the app reads, but a recipe can
// be in any language.
function instructions(kind: RecipeSource['kind']): string {
  return `You read a recipe for a recipe app, from ${SOURCES[kind]}

Copy the recipe exactly as the source writes it: the same words, spelling, numbers, fractions, units, punctuation and language. Never translate, convert, correct, reword, complete or summarise anything. Leave out whatever the source doesn't say.

- isRecipe: false when the source holds no recipe; then leave the rest empty or null.
- title: the recipe's name.
- servings: how many it serves or makes, as written ("4", "24 pullaa", "4–6 annosta", "Makes 12"), or null.
- prepMinutes, cookMinutes, totalMinutes: the preparation, cooking and total times the source states, in minutes, or null. Never work them out from the steps.
- ingredients: each ingredient on a line of its own, without a bullet. Where the source puts ingredients under headings ("For the sauce", "Kastike"), each group is a section with its heading, written without a colon. Lines before any heading go in a section whose heading is null.
- steps: each step on a line of its own, without its number, in sections the same way. A step's sentences stay together on its line.
- language: the language the recipe is written in, as a two-letter ISO 639-1 code ("fi", "en", "sv"), or null.
- measures: whose cups and spoons the recipe measures in, only where it says so itself, as an Australian book does by giving its tablespoon as 20 ml ("australian"). Otherwise null.`
}

function content(source: RecipeSource): UserContent {
  switch (source.kind) {
    case 'photos':
      return source.photos.map(({ data, mediaType }) => ({
        type: 'file' as const,
        mediaType,
        data,
      }))
    case 'page':
      return [
        { type: 'text', text: `A page on ${source.site}:\n\n${source.text}` },
      ]
    case 'text':
      return [{ type: 'text', text: source.text }]
  }
}

// Asks the model for the recipe in the source. Throws if the provider
// fails or answers in another shape.
export async function askForRecipe(
  model: AiModel,
  source: RecipeSource,
  abortSignal?: AbortSignal,
): Promise<Answer> {
  const { output } = await generateText({
    model,
    abortSignal,
    instructions: instructions(source.kind),
    messages: [{ role: 'user', content: content(source) }],
    output: Output.object({ schema: answerSchema }),
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    timeout: AI_TIMEOUT_MS,
  })
  return output
}

// Bullets the model may leave on a line: "- 2 dl maitoa", "• 1 egg".
const BULLET = /^[-–—•·*▪◦‣]\s*/u
// The recipe in the model's answer, as the editor takes an import, or null
// if it found none. From a page or pasted text, each line is checked
// against the text it was read from.
export function recipeFromAnswer(
  answer: Answer,
  source: RecipeSource,
): AiImport | null {
  const check =
    source.kind === 'photos'
      ? (line: string): Checked => ({ text: line, found: true })
      : sourceChecker(source.text)
  const reworded: Array<string> = []
  const read = (line: string): string => {
    const { text, found } = check(line)
    if (!found && text !== '') reworded.push(text)
    return text
  }

  const sections = (
    written: Answer['ingredients'],
    tidy: (line: string) => string,
  ): Array<Section> =>
    written
      .map(({ heading, lines }) => {
        const title = heading?.replace(/\s*:\s*$/, '').trim() || null
        const checked = title === null ? null : check(title)
        if (checked && !checked.found) reworded.push(`${checked.text}:`)
        return {
          heading: checked?.text ?? null,
          lines: lines.map((line) => read(tidy(line))).filter(Boolean),
        }
      })
      .filter((section) => section.lines.length > 0)

  const withoutBullet = (line: string) => line.trim().replace(BULLET, '')
  const ingredients = sections(answer.ingredients, withoutBullet)
  const steps = sections(answer.steps, (line) =>
    withoutStepNumber(withoutBullet(line)),
  )
  if (!answer.isRecipe || (ingredients.length === 0 && steps.length === 0)) {
    return null
  }

  // The title and servings aren't lines the editor can mark: one that
  // isn't in the text is the model's title, or no servings.
  const found = (text: string | null) => {
    if (text === null || text.trim() === '') return null
    const checked = check(text)
    return checked.found ? checked.text : null
  }
  const title = answer.title?.trim()
    ? (found(answer.title) ?? answer.title.trim())
    : null
  const text = [
    title,
    ...[...ingredients, ...steps].flatMap(({ heading, lines }) => [
      heading,
      ...lines,
    ]),
  ]
    .filter((line) => line !== null)
    .join('\n')

  const common = {
    imageUrl: null,
    servings: found(answer.servings),
    prepMinutes: minutes(answer.prepMinutes),
    cookMinutes: minutes(answer.cookMinutes),
    totalMinutes: minutes(answer.totalMinutes),
    ingredients,
    steps,
  }

  if (source.kind === 'page') {
    const facts = pageFacts(source.page, source.pageUrl)
    // As for any import: the language the page states, unless its text
    // says otherwise, and the measures of its site, region or language.
    const stated = recipeLanguageOf(facts.lang)
    const language = recipeLanguage(text, stated)
    const region = stated === language ? regionOf(facts.lang) : null
    return {
      recipe: {
        ...common,
        title: title ?? facts.title ?? source.site,
        language,
        measuringSystem: guessMeasuringSystem(source.site, language, region),
        sourceName: facts.siteName,
        sourceUrl: facts.url,
      },
      reworded,
    }
  }

  // The language the model names, unless franc overrules it, and the
  // measures it finds the recipe states, otherwise the language's.
  const language = recipeLanguage(text, namedLanguage(answer.language))
  return {
    recipe: {
      ...common,
      title: title ?? '',
      language,
      measuringSystem: answer.measures ?? guessMeasuringSystem(null, language),
      sourceName: null,
      sourceUrl: null,
    },
    reworded,
  }
}

function namedLanguage(code: string | null): RecipeLanguage | null {
  const language = recipeLanguageOf(code)
  return language !== null &&
    language !== UNKNOWN_LANGUAGE &&
    isRecipeLanguage(language)
    ? language
    : null
}

// Whole minutes, as the editor takes them, or null for none.
function minutes(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  return rounded > 0 && rounded < 100_000 ? rounded : null
}

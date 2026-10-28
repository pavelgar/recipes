import { CoverPhoto } from '@/components/cover-photo'
import { recipeLanguageName, SYSTEM_NAMES } from '@/i18n/choice-names'
import { siteOf } from '@/core/import/link'
import { m } from '@/paraglide/messages'
import type { Section } from '@/server/db/schema'
import type { RecipeLanguage } from '@/core/languages'
import type { MeasuringSystem } from '@/core/quantities'

type Readable = {
  title: string
  language: RecipeLanguage
  measuringSystem: MeasuringSystem
  servings: string | null
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  ingredients: ReadonlyArray<Section>
  steps: ReadonlyArray<Section>
  sourceName: string | null
  sourceUrl: string | null
  photo: string | null
}

// A plain read-out of a recipe, until the recipe view is built.
export function RecipeReadout({ recipe }: { recipe: Readable }) {
  const minutes = (value: number | null) =>
    value === null ? null : m.recipe_minutes({ minutes: value })
  const facts = [
    [m.recipe_servings(), recipe.servings],
    [m.recipe_prep(), minutes(recipe.prepMinutes)],
    [m.recipe_cook(), minutes(recipe.cookMinutes)],
    [m.recipe_total(), minutes(recipe.totalMinutes)],
    [m.recipe_language(), recipeLanguageName(recipe.language)],
    [m.recipe_measures(), SYSTEM_NAMES[recipe.measuringSystem]()],
  ] as const
  const source =
    recipe.sourceName ?? (recipe.sourceUrl ? siteOf(recipe.sourceUrl) : null)

  return (
    <article lang={recipe.language} className="flex flex-col gap-6">
      {recipe.photo && <CoverPhoto id={recipe.photo} />}
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold text-balance">
          {recipe.title}
        </h1>
        {source && (
          <p className="text-sm text-muted-foreground">
            {m.recipe_source()}:{' '}
            {recipe.sourceUrl ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {source}
              </a>
            ) : (
              source
            )}
          </p>
        )}
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        {facts
          .filter(([, value]) => value !== null)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      <Sections title={m.recipe_ingredients()} sections={recipe.ingredients} />
      <Sections title={m.recipe_steps()} sections={recipe.steps} numbered />
    </article>
  )
}

function Sections({
  title,
  sections,
  numbered = false,
}: {
  title: string
  sections: ReadonlyArray<Section>
  numbered?: boolean
}) {
  if (sections.length === 0) return null
  const List = numbered ? 'ol' : 'ul'
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {sections.map((section, index) => (
        <div key={index} className="flex flex-col gap-2">
          {section.heading && (
            <h3 className="text-sm font-semibold">{section.heading}</h3>
          )}
          <List
            className={
              numbered
                ? 'flex list-decimal flex-col gap-2 pl-5'
                : 'flex list-disc flex-col gap-1 pl-5'
            }
          >
            {section.lines.map((line, lineIndex) => (
              <li key={lineIndex}>{line}</li>
            ))}
          </List>
        </div>
      ))}
    </section>
  )
}

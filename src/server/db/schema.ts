import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { MEASURING_SYSTEMS } from '@/core/recipe/choices'
import type { RecipeLanguage } from '@/core/languages'

// Ingredient lines or steps under an optional heading ("For the sauce"). A
// recipe without sections has one section, with no heading. Each line is
// one ingredient line or one step, kept exactly as written: recognition,
// scaling and conversion happen when the recipe is shown.
export type Section = {
  readonly heading: string | null
  readonly lines: ReadonlyArray<string>
}

export const recipes = sqliteTable('recipes', {
  // Never reused, so a link or an offline copy can't come to point at
  // another recipe once a deleted one is purged.
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  // The language it's written in ("fi", "sv"), whether or not the app has
  // rules for it, or "und" when nobody knows.
  language: text('language').$type<RecipeLanguage>().notNull(),
  // How the recipe's units read: the size of its cups and spoons.
  measuringSystem: text('measuring_system', {
    enum: MEASURING_SYSTEMS,
  }).notNull(),
  // As written: "4", "24 pullaa", "4–6 annosta". The number scales and the
  // word stays.
  servings: text('servings'),
  prepMinutes: integer('prep_minutes'),
  cookMinutes: integer('cook_minutes'),
  // The total the source publishes, if it gives one. Never filled in from
  // prep plus cook.
  totalMinutes: integer('total_minutes'),
  ingredients: text('ingredients', { mode: 'json' })
    .$type<ReadonlyArray<Section>>()
    .notNull(),
  steps: text('steps', { mode: 'json' })
    .$type<ReadonlyArray<Section>>()
    .notNull(),
  // Where the recipe came from: a name ("Valio", "Kotiruokaa, s. 112"), a
  // web address, or both.
  sourceName: text('source_name'),
  sourceUrl: text('source_url'),
  // The id of its one cover photo, a file in the photos folder, if it has
  // one.
  photo: text('photo'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  // Set when the recipe is deleted. It can be restored for 30 days, after
  // which it is purged.
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
})

// Every day a recipe was cooked, not only the last.
export const cookedDates = sqliteTable(
  'cooked_dates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    // The household's calendar day, "2026-10-24": the day counts, not the
    // moment.
    cookedOn: text('cooked_on').notNull(),
  },
  (table) => [index('cooked_dates_recipe_id').on(table.recipeId)],
)

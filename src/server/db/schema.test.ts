import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '@/server/db/schema'
import { cookedDates, recipes } from '@/server/db/schema'

describe('database schema', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>

  // A fresh database with every migration applied, as the server does.
  beforeEach(async () => {
    db = drizzle({ connection: { url: ':memory:' }, schema })
    await migrate(db, { migrationsFolder: 'src/server/db/migrations' })
  })

  it('keeps ingredient lines and sections as written', async () => {
    // From the corpus: https://kotiliesi.fi/resepti/etikkasilakat/
    const ingredients = [
      {
        heading: null,
        lines: [
          '8  silakkafileetä',
          '  korppujauhoja',
          '  suolaa, pippuria',
          '1  sipuli',
          '2 rkl voita',
        ],
      },
      {
        heading: 'Etikkaliemi',
        lines: ['1 dl etikkaa', '2 dl sokeria', '3 dl vettä'],
      },
    ]
    const [{ id }] = await db
      .insert(recipes)
      .values({
        title: 'Etikkasilakat',
        language: 'fi',
        measuringSystem: 'metric',
        ingredients,
        steps: [],
        sourceName: 'Kotiliesi',
        sourceUrl: 'https://kotiliesi.fi/resepti/etikkasilakat/',
      })
      .returning({ id: recipes.id })

    const saved = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
    })
    expect(saved).toMatchObject({
      ingredients,
      servings: null,
      photo: null,
      deletedAt: null,
    })
    expect(saved?.createdAt).toBeInstanceOf(Date)
  })

  it('removes cooked dates with a purged recipe', async () => {
    // From the corpus: https://www.valio.fi/reseptit/granolanakkari/
    const [{ id }] = await db
      .insert(recipes)
      .values({
        title: 'Granolanäkkäri',
        language: 'fi',
        measuringSystem: 'metric',
        servings: '15 näkkileipää',
        ingredients: [],
        steps: [],
      })
      .returning({ id: recipes.id })
    await db
      .insert(cookedDates)
      .values({ recipeId: id, cookedOn: '2026-10-24' })

    await db.delete(recipes).where(eq(recipes.id, id))

    expect(await db.select().from(cookedDates)).toEqual([])
  })
})

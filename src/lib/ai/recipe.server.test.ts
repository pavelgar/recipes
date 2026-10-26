import { parseDocument } from 'htmlparser2'
import { MockLanguageModelV4 } from 'ai/test'
import { describe, expect, it } from 'vitest'
import { askForRecipe, recipeFromAnswer } from '@/lib/ai/recipe.server'
import { textOfPage } from '@/lib/import/page-text'
import type { Answer, RecipeSource } from '@/lib/ai/recipe.server'

// https://www.meillakotona.fi/reseptit/kermainen-kanapata (corpus/): its
// yield, first ingredients and steps, as someone could paste them from a
// message, with dashes for bullets.
const KANAPATA = `Kermainen kanapata
4 annosta
- 600 g broilerin paistileikkeitä
- 1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)
- 5 dl vettä
Lisää pataan vesi, kerma ja mausteet ja sekoita.Siirrä pata 225-asteisen uunin alaosaan ja kypsennä 15 minuuttia.
Laske uunin lämpö 175 asteeseen ja jatka kypsennystä vielä noin 45 minuuttia.`

// What a model might answer for it: one line in other letter case, a
// bullet left on, one line converted to cups and a heading made up, which
// the source doesn't have.
const KANAPATA_ANSWER: Answer = {
  isRecipe: true,
  title: 'Kermainen kanapata',
  servings: '4 annosta',
  prepMinutes: null,
  cookMinutes: 60,
  totalMinutes: null,
  ingredients: [
    {
      heading: null,
      lines: [
        '600 G broilerin paistileikkeitä',
        '- 1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)',
      ],
    },
    { heading: 'Liemi:', lines: ['2 cups vettä'] },
  ],
  steps: [
    {
      heading: null,
      lines: [
        '1. Lisää pataan vesi, kerma ja mausteet ja sekoita.',
        '2. Siirrä pata 225-asteisen uunin alaosaan ja kypsennä 15 minuuttia.',
        'Laske uunin lämpö 175 asteeseen ja jatka kypsennystä vielä noin 45 minuuttia.',
      ],
    },
  ],
  language: 'fi',
  measures: null,
}

const EMPTY: Answer = {
  isRecipe: false,
  title: null,
  servings: null,
  prepMinutes: null,
  cookMinutes: null,
  totalMinutes: null,
  ingredients: [],
  steps: [],
  language: null,
  measures: null,
}

// https://www.recipetineats.com/fondant-potatoes/ (corpus/), as if
// photographed from an Australian book that gives its tablespoon as
// 20 ml.
const FONDANT: Answer = {
  ...EMPTY,
  isRecipe: true,
  title: 'Fondant Potatoes (Melting potatoes)',
  servings: '8',
  ingredients: [
    {
      heading: null,
      lines: [
        '3/4 tsp cooking salt / kosher salt',
        '2 tbsp extra virgin olive oil',
      ],
    },
  ],
  language: 'en',
  measures: 'australian',
}

describe('recipeFromAnswer', () => {
  const pasted: RecipeSource = { kind: 'text', text: KANAPATA }

  it('takes lines found in pasted text as it writes them', () => {
    const read = recipeFromAnswer(KANAPATA_ANSWER, pasted)
    expect(read?.recipe).toEqual({
      title: 'Kermainen kanapata',
      language: 'fi',
      measuringSystem: 'metric',
      servings: '4 annosta',
      prepMinutes: null,
      cookMinutes: 60,
      totalMinutes: null,
      ingredients: [
        {
          heading: null,
          lines: [
            '600 g broilerin paistileikkeitä',
            '1 ps (350 g) salottisipuleita (tai muita pikkusipuleita)',
          ],
        },
        { heading: 'Liemi', lines: ['2 cups vettä'] },
      ],
      // Its step numbers go, as the import drops a page's.
      steps: [
        {
          heading: null,
          lines: [
            'Lisää pataan vesi, kerma ja mausteet ja sekoita.',
            'Siirrä pata 225-asteisen uunin alaosaan ja kypsennä 15 minuuttia.',
            'Laske uunin lämpö 175 asteeseen ja jatka kypsennystä vielä noin 45 minuuttia.',
          ],
        },
      ],
      sourceName: null,
      sourceUrl: null,
    })
  })

  it('names the lines and headings written differently in the source', () => {
    expect(recipeFromAnswer(KANAPATA_ANSWER, pasted)?.reworded).toEqual([
      'Liemi:',
      '2 cups vettä',
    ])
  })

  it('leaves out servings the source doesn’t give', () => {
    const read = recipeFromAnswer(
      { ...KANAPATA_ANSWER, servings: '4' },
      { kind: 'text', text: KANAPATA.replace('4 annosta\n', '') },
    )
    expect(read?.recipe.servings).toBeNull()
  })

  it('finds no recipe where the model finds none, or no lines', () => {
    expect(recipeFromAnswer(EMPTY, pasted)).toBeNull()
    expect(
      recipeFromAnswer(
        {
          ...EMPTY,
          isRecipe: true,
          title: 'Kermainen kanapata',
          ingredients: [{ heading: null, lines: ['  '] }],
        },
        pasted,
      ),
    ).toBeNull()
  })

  it('takes only whole minutes over zero', () => {
    const read = recipeFromAnswer(
      {
        ...KANAPATA_ANSWER,
        prepMinutes: 0,
        cookMinutes: 59.6,
        totalMinutes: -5,
      },
      pasted,
    )
    expect(read?.recipe).toMatchObject({
      prepMinutes: null,
      cookMinutes: 60,
      totalMinutes: null,
    })
  })

  it('takes photos as the model read them, with the measures it found', () => {
    const read = recipeFromAnswer(FONDANT, { kind: 'photos', photos: [] })
    expect(read?.reworded).toEqual([])
    expect(read?.recipe).toMatchObject({
      title: 'Fondant Potatoes (Melting potatoes)',
      servings: '8',
      language: 'en',
      measuringSystem: 'australian',
      sourceUrl: null,
    })
  })

  it('guesses measures from the language when the model finds none', () => {
    const read = recipeFromAnswer(
      { ...FONDANT, measures: null },
      { kind: 'photos', photos: [] },
    )
    expect(read?.recipe.measuringSystem).toBe('us')
  })

  it("leaves a language it can't name unknown", () => {
    const read = recipeFromAnswer(
      { ...FONDANT, language: 'not a language' },
      { kind: 'photos', photos: [] },
    )
    expect(read?.recipe.language).toBe('und')
  })

  it('reads a page as any import: its language, site and address', () => {
    const html = `<html lang="fi"><head>
      <meta property="og:site_name" content="Meillä kotona">
      <link rel="canonical" href="https://www.meillakotona.fi/reseptit/kermainen-kanapata">
      </head><body>${KANAPATA.split('\n')
        .map((line) => `<p>${line}</p>`)
        .join('')}</body></html>`
    const page = parseDocument(html)
    const read = recipeFromAnswer(KANAPATA_ANSWER, {
      kind: 'page',
      text: textOfPage(page),
      page,
      pageUrl: 'https://www.meillakotona.fi/reseptit/kermainen-kanapata?ref=1',
      site: 'meillakotona.fi',
    })
    expect(read?.recipe).toMatchObject({
      title: 'Kermainen kanapata',
      language: 'fi',
      measuringSystem: 'metric',
      sourceName: 'Meillä kotona',
      sourceUrl: 'https://www.meillakotona.fi/reseptit/kermainen-kanapata',
    })
    expect(read?.reworded).toEqual(['Liemi:', '2 cups vettä'])
  })
})

describe('askForRecipe', () => {
  // A model that answers with the given JSON and keeps what it was asked.
  function modelAnswering(answer: unknown) {
    return new MockLanguageModelV4({
      doGenerate: () =>
        Promise.resolve({
          content: [{ type: 'text', text: JSON.stringify(answer) }],
          finishReason: { unified: 'stop', raw: undefined },
          usage: {
            inputTokens: {
              total: 10,
              noCache: 10,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: 20, text: 20, reasoning: undefined },
          },
          warnings: [],
        }),
    })
  }

  it('asks for the answer to a JSON schema and gets it back', async () => {
    const model = modelAnswering(KANAPATA_ANSWER)
    const answer = await askForRecipe(model, { kind: 'text', text: KANAPATA })
    expect(answer).toEqual(KANAPATA_ANSWER)
    const [call] = model.doGenerateCalls
    expect(call.responseFormat).toMatchObject({
      type: 'json',
      schema: { type: 'object' },
    })
    expect(JSON.stringify(call.prompt)).toContain('Kermainen kanapata')
  })

  it('passes cancellation through to the model request', async () => {
    const controller = new AbortController()
    const model = modelAnswering(KANAPATA_ANSWER)
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    model.doGenerate = ({ abortSignal }) =>
      new Promise((_, reject) => {
        abortSignal!.addEventListener(
          'abort',
          () => reject(abortSignal!.reason),
          { once: true },
        )
        started()
      })
    const result = askForRecipe(
      model,
      { kind: 'text', text: KANAPATA },
      controller.signal,
    )
    const rejected = expect(result).rejects.toThrow('Stopped reading')
    await ready
    controller.abort(new Error('Stopped reading'))
    await rejected
  })

  it('sends photos as images, in the order given', async () => {
    const model = modelAnswering(FONDANT)
    const photo = (byte: number) => ({
      data: new Uint8Array([0xff, 0xd8, byte]),
      mediaType: 'image/jpeg',
    })
    await askForRecipe(model, { kind: 'photos', photos: [photo(1), photo(2)] })
    const user = model.doGenerateCalls[0].prompt.find(
      (message) => message.role === 'user',
    )
    expect(user?.content).toMatchObject([
      { type: 'file', mediaType: 'image/jpeg' },
      { type: 'file', mediaType: 'image/jpeg' },
    ])
  })

  it('throws when the answer is not a recipe’s shape', async () => {
    const model = modelAnswering({ recipe: 'Kermainen kanapata' })
    await expect(
      askForRecipe(model, { kind: 'text', text: KANAPATA }),
    ).rejects.toThrow()
  })
})

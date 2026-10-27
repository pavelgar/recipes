import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { RecipeEditor } from '@/components/recipe-editor'
import { Toaster } from '@/components/ui/toast'
import { MAX_TEXT } from '@/lib/ai/limits'
import { emptyDraft, loadDraft } from '@/lib/editor/draft'
import type { TidyResult } from '@/lib/ai/ai.functions'
import type { Draft } from '@/lib/editor/draft'

// The editor in Chromium, with the server functions it calls replaced, so
// each test decides what the server answers: the states of Tidy, saving
// and the language the text reads as. The e2e tests run the real server.

const server = vi.hoisted(() => ({
  createRecipe: vi.fn<(input: { data: unknown }) => Promise<{ id: number }>>(),
  aiAvailable: vi.fn(() => true),
  tidySteps:
    vi.fn<(input: { data: { steps: string } }) => Promise<TidyResult>>(),
  suggestLanguage: vi.fn<() => Promise<string | null>>(),
}))

vi.mock('@/db/recipes.functions', () => ({
  createRecipe: server.createRecipe,
}))
vi.mock('@/lib/ai/ai.functions', () => ({
  aiStatusQuery: {
    queryKey: ['ai'],
    queryFn: () => Promise.resolve({ available: server.aiAvailable() }),
  },
  tidySteps: server.tidySteps,
}))
vi.mock('@/lib/languages.functions', () => ({
  suggestLanguage: server.suggestLanguage,
}))
// Adding a photo is covered by e2e/photos.spec.ts, against the real server.
vi.mock('@/lib/photos/photos.functions', () => ({
  uploadPhoto: vi.fn(),
}))
// The shell reads the sidebar cookie through Start's server functions.
vi.mock('@/components/app-shell', () => ({
  FLOATING_BAR: '',
  useHideMenu: () => {},
}))

// https://www.valio.fi/reseptit/tomaattinen-peltileipa/ (corpus/), with
// two of its steps run together as pages publish them.
const STEPS = [
  'Lämmitä maito 42-asteiseksi.',
  'Painele taikina ohueksi (1- 1 ½ cm) levyksi leivinpaperilla vuoratulle pellille.',
]
const RUN_TOGETHER = STEPS.join('')
const draft = (changes: Partial<Draft> = {}): Draft => ({
  ...emptyDraft('fi'),
  title: 'Tomaattinen peltileipä',
  ingredients: '5 dl Valio maitoa\n1 pussi (11 g) kuivahiivaa',
  steps: RUN_TOGETHER,
  ...changes,
})

async function renderEditor(initial: Draft = draft()) {
  const rootRoute = createRootRoute({
    component: () => (
      <Toaster>
        <RecipeEditor origin={{ kind: 'typed' }} initial={initial} />
      </Toaster>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/add'] }),
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  const steps = screen.getByRole('textbox', { name: 'Steps' })
  return { screen, router, steps }
}

// An answer the test gives when it chooses.
function later<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  server.aiAvailable.mockReturnValue(true)
  server.suggestLanguage.mockResolvedValue(null)
})

describe('Tidy steps', () => {
  it('puts each step on its own line, and Undo puts them back', async () => {
    server.tidySteps.mockResolvedValue({ ok: true, steps: STEPS.join('\n') })
    const { screen, steps } = await renderEditor()

    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    await expect.element(steps).toHaveValue(STEPS.join('\n'))
    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent('Steps tidied.')
    expect(server.tidySteps).toHaveBeenCalledWith({
      data: { steps: RUN_TOGETHER },
    })

    await screen.getByRole('button', { name: 'Undo' }).click()
    await expect.element(steps).toHaveValue(RUN_TOGETHER)
    await expect.element(steps).toHaveFocus()
    await expect
      .element(screen.getByRole('button', { name: 'Tidy steps' }))
      .toBeVisible()
  })

  it('becomes Tidy again once the steps are edited', async () => {
    server.tidySteps.mockResolvedValue({ ok: true, steps: STEPS.join('\n') })
    const { screen, steps } = await renderEditor()
    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    await expect
      .element(screen.getByRole('button', { name: 'Undo' }))
      .toBeVisible()

    await userEvent.fill(steps, `${STEPS.join('\n')} Kypsennä.`)
    await expect
      .element(screen.getByRole('button', { name: 'Tidy steps' }))
      .toBeVisible()
  })

  it('stays Undo when another field changes', async () => {
    server.tidySteps.mockResolvedValue({ ok: true, steps: STEPS.join('\n') })
    const { screen } = await renderEditor()
    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    await expect
      .element(screen.getByRole('button', { name: 'Undo' }))
      .toBeVisible()

    await userEvent.type(screen.getByRole('textbox', { name: 'Servings' }), '1')
    await expect
      .element(screen.getByRole('button', { name: 'Undo' }))
      .toBeVisible()
  })

  it('says when the steps were already tidy, and still offers Undo', async () => {
    server.tidySteps.mockResolvedValue({ ok: true, steps: STEPS.join('\n') })
    const { screen, steps } = await renderEditor(
      draft({ steps: STEPS.join('\n') }),
    )

    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent('The steps were already tidy.')
    await expect.element(steps).toHaveValue(STEPS.join('\n'))
    await expect
      .element(screen.getByRole('button', { name: 'Undo' }))
      .toBeVisible()
  })

  it('keeps the steps when the model changed their words', async () => {
    server.tidySteps.mockResolvedValue({ ok: false, code: 'changed-words' })
    const { screen, steps } = await renderEditor()

    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    const error = screen.getByText(
      "Couldn't tidy the steps without changing their words.",
    )
    await expect.element(error).toBeVisible()
    await expect.element(steps).toHaveValue(RUN_TOGETHER)
    await expect
      .element(steps)
      .toHaveAccessibleDescription(
        "Couldn't tidy the steps without changing their words.",
      )

    // Editing the steps clears it.
    await userEvent.type(steps, ' ')
    await expect.element(error).not.toBeInTheDocument()
  })

  it('says when tidying failed', async () => {
    server.tidySteps.mockRejectedValue(new Error('offline'))
    const { screen, steps } = await renderEditor()

    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    await expect
      .element(screen.getByText("Couldn't tidy the steps. Try again."))
      .toBeVisible()
    await expect.element(steps).toHaveValue(RUN_TOGETHER)
  })

  it('drops an answer to steps that were edited while it was coming', async () => {
    const answer = later<TidyResult>()
    server.tidySteps.mockReturnValue(answer.promise)
    const { screen, steps } = await renderEditor()

    await screen.getByRole('button', { name: 'Tidy steps' }).click()
    await userEvent.fill(steps, `${RUN_TOGETHER} Kypsennä.`)
    answer.resolve({ ok: true, steps: STEPS.join('\n') })

    await expect
      .element(screen.getByRole('button', { name: 'Tidy steps' }))
      .toBeEnabled()
    await expect.element(steps).toHaveValue(`${RUN_TOGETHER} Kypsennä.`)
  })

  it('sends nothing longer than the limit', async () => {
    const { screen, steps } = await renderEditor(
      draft({ steps: 'a'.repeat(MAX_TEXT + 1) }),
    )
    await screen.getByRole('button', { name: 'Tidy steps' }).click()

    await expect
      .element(screen.getByText('This text is too long.', { exact: false }))
      .toBeVisible()
    await expect.element(steps).toHaveValue('a'.repeat(MAX_TEXT + 1))
    expect(server.tidySteps).not.toHaveBeenCalled()
  })

  it('is not offered without an AI model', async () => {
    server.aiAvailable.mockReturnValue(false)
    const { screen } = await renderEditor()
    await expect
      .element(screen.getByRole('textbox', { name: 'Steps' }))
      .toBeVisible()
    await expect
      .element(screen.getByRole('button', { name: 'Tidy steps' }))
      .not.toBeInTheDocument()
  })
})

describe('saving', () => {
  it('saves the recipe and goes to it', async () => {
    server.createRecipe.mockResolvedValue({ id: 7 })
    const { screen, router } = await renderEditor()

    await screen.getByRole('button', { name: 'Save' }).click()
    await vi.waitFor(() =>
      expect(router.state.location.pathname).toBe('/recipes/7'),
    )
    expect(server.createRecipe).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Tomaattinen peltileipä',
        language: 'fi',
        measuringSystem: 'metric',
      }),
    })
    expect(loadDraft({ kind: 'typed' })).toBeNull()
  })

  it('says when saving failed, and keeps the draft', async () => {
    server.createRecipe.mockRejectedValue(new Error('offline'))
    const { screen, router } = await renderEditor()

    await screen.getByRole('button', { name: 'Save' }).click()
    // The toast, and its announcement to screen readers.
    const failed = screen
      .getByText("Couldn't save the recipe. Try again.")
      .first()
    await expect.element(failed).toBeVisible()
    expect(router.state.location.pathname).toBe('/add')

    // Saving again closes it.
    server.createRecipe.mockResolvedValue({ id: 8 })
    await screen.getByRole('button', { name: 'Save' }).click()
    await expect.element(failed).not.toBeInTheDocument()
  })

  it('goes to the first field with a mistake', async () => {
    const { screen } = await renderEditor(
      draft({ title: '', cookMinutes: 'noin 40' }),
    )

    await screen.getByRole('button', { name: 'Save' }).click()
    await expect
      .element(screen.getByRole('textbox', { name: 'Title' }))
      .toHaveFocus()
    await expect
      .element(screen.getByText('Give the recipe a title.'))
      .toBeVisible()
    await expect
      .element(screen.getByText('Write the time in whole minutes.'))
      .toBeVisible()
    expect(server.createRecipe).not.toHaveBeenCalled()
  })
})

describe('the recipe language', () => {
  it('offers the language the text reads as', async () => {
    server.suggestLanguage.mockResolvedValue('sv')
    const { screen } = await renderEditor(
      draft({ language: 'en', measuringSystem: 'us' }),
    )

    await screen.getByRole('button', { name: 'Switch to it' }).click()
    await expect
      .element(screen.getByRole('combobox', { name: 'Recipe language' }))
      .toMatchTextContent('Swedish')
    // Measures that followed the language follow it.
    await expect
      .element(screen.getByRole('combobox', { name: 'Measures' }))
      .toMatchTextContent('Metric')
    await expect
      .element(
        screen.getByText("The app doesn't recognise amounts", { exact: false }),
      )
      .toBeVisible()
  })

  it('asks no more while the text is the same', async () => {
    const { screen } = await renderEditor()
    await expect
      .element(screen.getByRole('textbox', { name: 'Title' }))
      .toBeVisible()
    await vi.waitFor(() =>
      expect(server.suggestLanguage).toHaveBeenCalledOnce(),
    )

    await screen.getByRole('textbox', { name: 'Title' }).click()
    await screen.getByRole('textbox', { name: 'Servings' }).click()
    expect(server.suggestLanguage).toHaveBeenCalledOnce()
  })
})

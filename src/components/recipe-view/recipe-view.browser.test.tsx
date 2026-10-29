import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { RecipeView } from '@/components/recipe-view/recipe-view'
import { Toaster } from '@/components/ui/toast'
import { ALARM_FOR_MS, playAlarm } from '@/components/recipe-view/alarm'
import {
  FINISHED_TIMER_KEPT_MS,
  lineKeys,
  saveProgress,
} from '@/components/recipe-view/recipe-progress'
import type { ViewedRecipe } from '@/components/recipe-view/recipe-view'
import type * as Alarm from '@/components/recipe-view/alarm'

// The recipe view in Chromium: servings, crossing off, the current step and
// timers. Its photo and saving are covered by the e2e tests.

// The shell reads the sidebar cookie through Start's server functions.
vi.mock('@/components/app-shell', () => ({
  FLOATING_BAR: 'fixed',
  ABOVE_BOTTOM_BAR: 'bottom-20',
}))
// Sound can't be heard in a test, so the alarm only says it played.
vi.mock('@/components/recipe-view/alarm', async (actual) => ({
  ...(await actual<typeof Alarm>()),
  playAlarm: vi.fn(),
}))

const recipe = (changes: Partial<ViewedRecipe>): ViewedRecipe => ({
  id: 1,
  title: '',
  language: 'en',
  measuringSystem: 'us',
  servings: null,
  prepMinutes: null,
  cookMinutes: null,
  totalMinutes: null,
  ingredients: [],
  steps: [],
  sourceName: null,
  sourceUrl: null,
  photo: null,
  ...changes,
})

// Real recipes from the development corpus (corpus/AGENTS.md), whose steps
// are the sentences the corpus keeps.
// https://www.allrecipes.com/recipe/214488/lemon-chicken-piccata/
const PICCATA = recipe({
  title: 'Lemon Chicken Piccata',
  servings: '4',
  prepMinutes: 20,
  cookMinutes: 30,
  totalMinutes: 50,
  sourceName: 'Allrecipes',
  sourceUrl: 'https://www.allrecipes.com/recipe/214488/lemon-chicken-piccata/',
  ingredients: [
    {
      heading: null,
      lines: [
        '1 clove garlic, minced',
        '2 tablespoons capers, drained and rinsed',
      ],
    },
  ],
  steps: [
    {
      heading: null,
      lines: [
        'Preheat the oven to 200 degrees F (95 degrees C).',
        'Let cook, stirring occasionally, until the sauce reduces to about 2/3 cup, 5 to 8 minutes.',
      ],
    },
  ],
})
// https://www.valio.fi/reseptit/tomaattinen-peltileipa/
const PELTILEIPA = recipe({
  id: 2,
  title: 'Tomaattinen peltileipä',
  language: 'fi',
  measuringSystem: 'metric',
  servings: '1 uunipellillinen',
  ingredients: [{ heading: null, lines: ['5 dl Valio maitoa'] }],
  steps: [
    {
      heading: null,
      lines: [
        'Lämmitä maito 42-asteiseksi.',
        'Painele taikina ohueksi (1- 1 ½ cm) levyksi leivinpaperilla vuoratulle pellille.',
        'Paista uunin keskiosassa 200 asteessa n. 15 min.',
      ],
    },
  ],
})

const START_TIMER = 'Step 2: start a timer for 5 to 8 minutes'
const STOP_TIMER = /^Step 2: stop the timer 5 to 8 minutes/
const DOCKED = /^Stop the timer for step 2 /

const renderView = (viewed: ViewedRecipe) =>
  render(
    <Toaster>
      <RecipeView recipe={viewed} />
    </Toaster>,
  )

beforeEach(() => {
  localStorage.clear()
  vi.mocked(playAlarm).mockClear()
})

describe('the header', () => {
  it('gives the times the recipe gives', async () => {
    const screen = await renderView(PICCATA)
    for (const [label, time] of [
      ['Prep time', '20 min'],
      ['Cook time', '30 min'],
      ['Total time', '50 min'],
    ]) {
      await expect
        .element(screen.getByRole('term').getByText(label))
        .toBeVisible()
      await expect
        .element(screen.getByRole('definition').getByText(time))
        .toBeVisible()
    }
  })
})

describe('servings', () => {
  it('scale the servings as written, and mark the amounts in the steps', async () => {
    const screen = await renderView(PICCATA)
    const servings = screen.getByRole('group', { name: 'Servings' })
    await expect.element(servings).toHaveTextContent('4')
    const note = screen.getByText('Amounts in the steps are for 4.')
    await expect.element(note).not.toBeInTheDocument()

    await screen.getByRole('button', { name: 'More servings' }).click()
    await expect.element(servings).toHaveTextContent('5')
    await expect.element(note).toBeVisible()

    await screen.getByRole('button', { name: 'Fewer servings' }).click()
    await expect.element(note).not.toBeInTheDocument()
  })

  it('leave the steps unmarked when they give no amounts', async () => {
    const screen = await renderView(PELTILEIPA)
    await screen.getByRole('button', { name: 'More servings' }).click()
    await expect
      .element(screen.getByRole('group', { name: 'Servings' }))
      .toHaveTextContent('1,5 uunipellillinen')
    await expect
      .element(screen.getByText(/Amounts in the steps/))
      .not.toBeInTheDocument()
  })
})

describe('steps', () => {
  it('lead with the current one, which Done crosses off and Back brings back', async () => {
    const screen = await renderView(PICCATA)
    const done = screen.getByRole('button', { name: 'Done', exact: true })

    await done.click()
    await expect
      .element(
        screen.getByRole('button', { name: 'Step 1, done. Mark not done' }),
      )
      .toBeVisible()

    await screen.getByRole('button', { name: 'Back to step 1' }).click()
    await expect
      .element(screen.getByRole('button', { name: 'Step 1, mark done' }))
      .toBeVisible()
    await expect
      .element(screen.getByRole('button', { name: 'Back to step 1' }))
      .not.toBeInTheDocument()
  })

  it('cross off with a tap on their text, and start over', async () => {
    const screen = await renderView(PICCATA)
    await screen.getByText('Preheat the oven to').click()
    await expect
      .element(
        screen.getByRole('button', { name: 'Step 1, done. Mark not done' }),
      )
      .toBeVisible()

    await screen.getByRole('button', { name: 'Start over' }).click()
    await expect
      .element(screen.getByRole('button', { name: 'Step 1, mark done' }))
      .toBeVisible()
  })

  it('show how many there are, then how many are done', async () => {
    const screen = await renderView(PICCATA)
    const bar = screen.getByRole('group', { name: 'Jump to' })
    await expect
      .element(bar.getByRole('button', { name: 'Ingredients 2' }))
      .toBeVisible()
    await expect
      .element(bar.getByRole('button', { name: 'Steps 2' }))
      .toBeVisible()

    await screen.getByRole('button', { name: 'Done', exact: true }).click()
    await screen.getByText('garlic, minced').click()
    await expect
      .element(bar.getByRole('button', { name: 'Ingredients 1/2' }))
      .toBeVisible()
    await expect
      .element(bar.getByRole('button', { name: 'Steps 1/2' }))
      .toBeVisible()
  })
})

describe('timers', () => {
  it('start from a time a step mentions, without crossing it off', async () => {
    const screen = await renderView(PICCATA)
    await screen.getByRole('button', { name: START_TIMER }).click()

    // In the step, the time keeps its words, with the time left after them.
    const inStep = screen.getByRole('list').getByRole('button', {
      name: /^Step 2: stop the timer 5 to 8 minutes [45]:\d\d left$/,
    })
    await expect.element(inStep).toBeVisible()
    // In the dock, with its step's number.
    const docked = screen.getByRole('button', {
      name: /^Stop the timer for step 2 [45]:\d\d left$/,
    })
    await expect.element(docked).toBeVisible()
    await expect
      .element(screen.getByRole('button', { name: 'Step 2, mark done' }))
      .toBeVisible()
  })

  it('stop with a tap, which can be undone', async () => {
    const screen = await renderView(PICCATA)
    await screen.getByRole('button', { name: START_TIMER }).click()
    await screen
      .getByRole('list')
      .getByRole('button', { name: STOP_TIMER })
      .click()
    await expect
      .element(screen.getByRole('button', { name: START_TIMER }))
      .toBeVisible()

    await screen.getByRole('button', { name: 'Undo' }).click()
    await expect
      .element(
        screen.getByRole('list').getByRole('button', { name: STOP_TIMER }),
      )
      .toBeVisible()
  })

  it('stop when the steps start over', async () => {
    const screen = await renderView(PICCATA)
    await screen.getByRole('button', { name: START_TIMER }).click()
    await expect
      .element(
        screen.getByRole('list').getByRole('button', { name: STOP_TIMER }),
      )
      .toBeVisible()

    await screen.getByRole('button', { name: 'Start over' }).click()
    await expect
      .element(screen.getByRole('button', { name: START_TIMER }))
      .toBeVisible()
    await expect
      .element(screen.getByRole('button', { name: 'Start over' }))
      .not.toBeInTheDocument()
  })
})

describe('ingredients', () => {
  it('check off one by one, and uncheck all at once', async () => {
    const screen = await renderView(PICCATA)
    const garlic = screen.getByRole('checkbox', {
      name: '1 clove garlic, minced',
    })
    await expect
      .element(screen.getByRole('button', { name: 'Uncheck all' }))
      .not.toBeInTheDocument()

    // A tap on the line checks it, as on its checkbox.
    await screen.getByText('garlic, minced').click()
    await expect.element(garlic).toBeChecked()

    await screen.getByRole('button', { name: 'Uncheck all' }).click()
    await expect.element(garlic).not.toBeChecked()
  })
})

describe('progress', () => {
  it('opens where it was left, on this device', async () => {
    const first = await renderView(PICCATA)
    await first.getByRole('button', { name: 'More servings' }).click()
    await first.getByText('garlic, minced').click()
    await first.getByRole('button', { name: 'Done', exact: true }).click()
    await first.getByRole('button', { name: START_TIMER }).click()
    await first.unmount()

    const again = await renderView(PICCATA)
    await expect
      .element(again.getByRole('group', { name: 'Servings' }))
      .toHaveTextContent('5')
    await expect
      .element(again.getByRole('checkbox', { name: /garlic, minced/ }))
      .toBeChecked()
    await expect
      .element(
        again.getByRole('button', { name: 'Step 1, done. Mark not done' }),
      )
      .toBeVisible()
    await expect
      .element(
        again.getByRole('list').getByRole('button', { name: STOP_TIMER }),
      )
      .toBeVisible()
  })

  it("keeps each recipe's apart", async () => {
    const first = await renderView(PICCATA)
    await first.getByRole('button', { name: 'More servings' }).click()
    await first.unmount()

    const other = await renderView(PELTILEIPA)
    await expect
      .element(other.getByRole('group', { name: 'Servings' }))
      .toHaveTextContent('1 uunipellillinen')
  })
})

describe('a timer whose time is up', () => {
  // A timer on the piccata's second step, kept as ending at `endsAt`.
  const keepTimer = (endsAt: number) =>
    saveProgress(PICCATA.id, {
      servings: null,
      crossed: [],
      timers: [
        {
          stepKey: lineKeys(PICCATA.steps, 'step')[0][1],
          time: 0,
          label: '5 to 8 minutes',
          seconds: 300,
          endsAt,
        },
      ],
    })
  const docked = (screen: Awaited<ReturnType<typeof renderView>>) =>
    screen.getByRole('button', { name: DOCKED })
  const UP = "Stop the timer for step 2 Time's up"

  it('beeps', async () => {
    keepTimer(Date.now() - 1000)
    const screen = await renderView(PICCATA)
    await expect.element(docked(screen)).toHaveAccessibleName(UP)
    await expect.poll(() => vi.mocked(playAlarm).mock.calls.length).toBe(1)
  })

  it('stops beeping after a while, and still says so', async () => {
    keepTimer(Date.now() - ALARM_FOR_MS - 1000)
    const screen = await renderView(PICCATA)
    await expect.element(docked(screen)).toHaveAccessibleName(UP)
    expect(playAlarm).not.toHaveBeenCalled()
  })

  it('goes once its time has long been up', async () => {
    keepTimer(Date.now() - FINISHED_TIMER_KEPT_MS - 1000)
    const screen = await renderView(PICCATA)
    await expect
      .element(screen.getByRole('button', { name: START_TIMER }))
      .toBeVisible()
    await expect.element(docked(screen)).not.toBeInTheDocument()
  })
})

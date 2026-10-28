import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openAddDialog } from './app'
import { PELTILEIPA, PELTILEIPA_PASTED } from './recipes'
import { aiApp, testSite } from './servers'
import type { Page } from '@playwright/test'

// Each screen, checked by axe against the WCAG A and AA rules it can test
// in the page. It catches missing names, broken ARIA and low contrast, not
// whether the screen is easy to use with a screen reader.
async function violations(page: Page) {
  // Colours at rest, not under the pointer of the last click.
  await page.mouse.move(0, 0)
  // Mid-fade, such as the menu's while a dialog opens, text is fainter than
  // it ends.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  )
  const { violations: found } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return found.map(({ id, help, nodes }) => ({
    id,
    help,
    targets: nodes.map((node) => node.target.join(' ')),
  }))
}

for (const path of ['/', '/library', '/queue', '/settings', '/add']) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('main').first()).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`the add dialog has no accessibility violations, ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme })
    await expect(await openAddDialog(page)).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
}

// Types in the sample recipe and saves it, which opens it.
async function saveRecipe(page: Page) {
  await page.goto('/add')
  await page.getByRole('textbox', { name: 'Title' }).fill(PELTILEIPA.title)
  await page
    .getByRole('textbox', { name: 'Ingredients' })
    .fill(PELTILEIPA.ingredients.join('\n'))
  await page
    .getByRole('textbox', { name: 'Steps' })
    .fill(PELTILEIPA.steps.join('\n'))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.getByRole('heading', { name: PELTILEIPA.title }),
  ).toBeVisible()
}

test('a saved recipe has no accessibility violations', async ({ page }) => {
  await saveRecipe(page)
  expect(await violations(page)).toEqual([])
})

// While cooking: the servings changed, lines crossed off, the current step
// further on, a timer running and then up, and on phones the ingredients
// in their drawer, in both themes. A timer that's up pulses unless the
// device asks for less motion; asking lets the check wait for the page to
// be still.
for (const theme of ['light', 'dark'] as const) {
  test(`a recipe being cooked has no accessibility violations, ${theme}`, async ({
    page,
    isMobile,
  }) => {
    await page.clock.install()
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await saveRecipe(page)
    await page
      .getByRole('checkbox', { name: PELTILEIPA.ingredients[0] })
      .check()
    await page.getByRole('button', { name: 'More servings' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page
      .getByRole('button', { name: 'Step 3: start a timer for 15 min' })
      .click()
    await expect(
      page.getByRole('button', { name: /^Step 3: stop the timer 15 min / }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Stop the timer for step 3 / }),
    ).toBeVisible()
    expect(await violations(page)).toEqual([])

    await page.clock.fastForward('15:01')
    await expect(
      page.getByRole('button', {
        name: "Step 3: stop the timer 15 min Time's up",
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: "Stop the timer for step 3 Time's up" }),
    ).toBeVisible()
    expect(await violations(page)).toEqual([])

    // The recipe is short, so on a screen this low its ingredients can
    // scroll away for the dock to offer them.
    if (isMobile) {
      await page.setViewportSize({ width: 412, height: 400 })
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      )
      const ingredients = page.getByRole('button', {
        name: 'Ingredients, 1/7 checked',
      })
      await expect(ingredients).toBeVisible()
      // Check the dock before its drawer hides it from the accessibility tree.
      expect(await violations(page)).toEqual([])
      await ingredients.click()
      await expect(
        page.getByRole('dialog', { name: 'Ingredients' }),
      ).toBeVisible()
      expect(await violations(page)).toEqual([])
    }
  })
}

// Its buttons lie over the photo.
test('the editor and the saved recipe have no accessibility violations with a photo', async ({
  page,
}) => {
  const dialog = await openAddDialog(page)
  const field = dialog.getByRole('textbox', { name: 'Link to a recipe' })
  await field.fill(`${testSite}/kuvalla`)
  await field.press('Enter')
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible()
  await page.waitForFunction(
    () => document.querySelector<HTMLImageElement>('form img')?.complete,
  )
  expect(await violations(page)).toEqual([])

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.getByRole('heading', { name: PELTILEIPA.title }),
  ).toBeVisible()
  expect(await violations(page)).toEqual([])
})

test('the editor has no accessibility violations with an error', async ({
  page,
}) => {
  await page.goto('/add')
  await page.getByRole('textbox', { name: 'Steps' }).fill(PELTILEIPA.steps[0])
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Give the recipe a title.')).toBeVisible()
  expect(await violations(page)).toEqual([])
})

test.describe('with an AI model', () => {
  test.use({ baseURL: aiApp })

  test('the editor has no accessibility violations with lines to check', async ({
    page,
  }) => {
    const dialog = await openAddDialog(page)
    await dialog.getByRole('button', { name: 'Paste text' }).click()
    await dialog
      .getByRole('textbox', { name: 'Recipe text' })
      .fill(PELTILEIPA_PASTED)
    await dialog.getByRole('button', { name: 'Read' }).click()
    await expect(
      page.getByText(
        'Marked lines are written differently in the source. Check them.',
      ),
    ).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
})

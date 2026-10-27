import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openAddDialog } from './app'
import { PELTILEIPA, PELTILEIPA_PASTED } from './recipes'
import { aiApp } from './servers'
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

test('a saved recipe has no accessibility violations', async ({ page }) => {
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

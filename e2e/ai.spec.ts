import { expect, test } from '@playwright/test'
import { openAddDialog } from './app'
import { PELTILEIPA, PELTILEIPA_PASTED } from './recipes'
import { aiApp } from './servers'

// The app with an AI model: fake-ai.ts, which answers with canned readings.
test.use({ baseURL: aiApp })

test('pasted text is read with AI into the editor', async ({ page }) => {
  const dialog = await openAddDialog(page)
  await dialog.getByRole('button', { name: 'Paste text' }).click()
  await dialog
    .getByRole('textbox', { name: 'Recipe text' })
    .fill(PELTILEIPA_PASTED)
  await dialog.getByRole('button', { name: 'Read' }).click()

  await expect(page).toHaveURL('/add?from=text')
  await expect(
    page.getByText('Read by AI from the pasted text. Check it before saving.'),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
  // The model left out "Valio", which the pasted text has.
  await expect(
    page.getByText(
      'Marked lines are written differently in the source. Check them.',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'Recipe language' }),
  ).toContainText('Finnish')

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/recipes\/\d+$/)
  await expect(
    page.getByRole('heading', { name: PELTILEIPA.title }),
  ).toBeVisible()
})

test('Tidy puts each step on its own line, and Undo puts them back', async ({
  page,
}) => {
  const runTogether = `1. ${PELTILEIPA.steps[0]}${PELTILEIPA.steps[1]}`
  await page.goto('/add')
  const steps = page.getByRole('textbox', { name: 'Steps' })
  await steps.fill(runTogether)

  await page.getByRole('button', { name: 'Tidy steps' }).click()
  await expect(steps).toHaveValue(PELTILEIPA.steps.slice(0, 2).join('\n'))
  await expect(
    page.getByRole('status').filter({ hasText: 'Steps tidied.' }),
  ).toBeAttached()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(steps).toHaveValue(runTogether)
  await expect(page.getByRole('button', { name: 'Tidy steps' })).toBeVisible()
})

test('with an AI model, photos and pasted text are offered', async ({
  page,
}) => {
  const dialog = await openAddDialog(page)
  await expect(
    dialog.getByRole('button', { name: 'Scan from photo' }),
  ).toBeEnabled()
  await expect(dialog.getByRole('button', { name: 'Paste text' })).toBeEnabled()
})

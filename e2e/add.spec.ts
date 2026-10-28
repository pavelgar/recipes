import { expect, test } from '@playwright/test'
import { openAddDialog } from './app'
import { PELTILEIPA } from './recipes'
import type { Page } from '@playwright/test'

async function typeRecipe(page: Page, recipe: typeof PELTILEIPA) {
  await page.getByRole('textbox', { name: 'Title' }).fill(recipe.title)
  await page.getByRole('textbox', { name: 'Servings' }).fill(recipe.servings)
  await page
    .getByRole('textbox', { name: 'Ingredients' })
    .fill(recipe.ingredients.join('\n'))
  await page
    .getByRole('textbox', { name: 'Steps' })
    .fill(recipe.steps.join('\n'))
}

test('a recipe typed in is saved and shown', async ({ page }) => {
  const dialog = await openAddDialog(page)
  await dialog.getByRole('link', { name: 'Enter manually' }).click()
  await expect(page).toHaveURL('/add')

  await typeRecipe(page, PELTILEIPA)
  // The interface is in English, so a typed recipe starts in English, and
  // its Finnish text gets it offered as the language it's written in.
  await page.getByRole('textbox', { name: 'Steps' }).blur()
  await page.getByRole('button', { name: 'Switch to it' }).click()
  await expect(
    page.getByRole('combobox', { name: 'Recipe language' }),
  ).toContainText('Finnish')
  await expect(page.getByRole('combobox', { name: 'Measures' })).toContainText(
    'Metric',
  )
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/\/recipes\/\d+$/)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: PELTILEIPA.title }),
  ).toBeVisible()
  // Each ingredient a line to check off, the steps a numbered list.
  const recipe = page.getByRole('article')
  await expect(recipe.getByRole('checkbox')).toHaveCount(
    PELTILEIPA.ingredients.length,
  )
  for (const line of PELTILEIPA.ingredients) {
    await expect(recipe.getByRole('checkbox', { name: line })).toBeVisible()
  }
  await expect(recipe.getByRole('list').getByRole('paragraph')).toHaveText(
    PELTILEIPA.steps,
  )
})

test('Save without a title goes to the title', async ({ page }) => {
  await page.goto('/add')
  await page
    .getByRole('textbox', { name: 'Ingredients' })
    .fill(PELTILEIPA.ingredients.join('\n'))
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('textbox', { name: 'Title' })).toBeFocused()
  await expect(page.getByText('Give the recipe a title.')).toBeVisible()
  await expect(page).toHaveURL('/add')
})

test('a draft comes back after a reload', async ({ page }) => {
  await page.goto('/add')
  await typeRecipe(page, PELTILEIPA)
  await page.reload()

  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
  await expect(page.getByRole('textbox', { name: 'Steps' })).toHaveValue(
    PELTILEIPA.steps.join('\n'),
  )
})

test('a discarded draft can be undone', async ({ page }) => {
  await page.goto('/add')
  await typeRecipe(page, PELTILEIPA)
  await page.getByRole('button', { name: 'Discard' }).click()
  await expect(page).toHaveURL('/')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page).toHaveURL('/add')
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
})

test('without an AI model, photos and pasted text are offered disabled', async ({
  page,
}) => {
  const dialog = await openAddDialog(page)
  await expect(
    dialog.getByRole('button', { name: 'Scan from photo' }),
  ).toBeDisabled()
  await expect(
    dialog.getByRole('button', { name: 'Paste text' }),
  ).toBeDisabled()
  await page.goto('/add')
  await page.getByRole('textbox', { name: 'Steps' }).fill(PELTILEIPA.steps[0])
  await expect(page.getByRole('button', { name: 'Tidy steps' })).toBeHidden()
})

test('a recipe that was never saved is not found', async ({ page }) => {
  await page.goto('/recipes/999999')
  await expect(
    page.getByRole('heading', { name: 'Recipe not found' }),
  ).toBeVisible()
})

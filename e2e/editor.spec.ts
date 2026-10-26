import { expect, test } from '@playwright/test'

// Back would otherwise open the editor again, with the import it was read
// from and its photo, to save a second recipe.
test('Back from a saved recipe skips its editor', async ({ page }) => {
  await page.goto('/')
  await page.goto('/add')
  // From the corpus: https://kotiliesi.fi/resepti/etikkasilakat/
  await page.getByRole('textbox', { name: 'Title' }).fill('Etikkasilakat')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/recipes\/\d+$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})

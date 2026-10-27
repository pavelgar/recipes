import { expect, test } from '@playwright/test'
import { openAddDialog } from './app'
import { PELTILEIPA } from './recipes'
import { testSite } from './servers'

// The app by its address on the home network, without HTTPS. Browsers
// leave out installing, offline use and some APIs there, and core features
// must work without them (DESIGN.md, "Deployment and access"). Only the
// plain-http project runs this file.

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Otherwise the tests would pass for the wrong reason.
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false)
})

test('a recipe typed in is saved and shown', async ({ page }) => {
  const dialog = await openAddDialog(page)
  await dialog.getByRole('link', { name: 'Enter manually' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill(PELTILEIPA.title)
  await page
    .getByRole('textbox', { name: 'Ingredients' })
    .fill(PELTILEIPA.ingredients.join('\n'))
  await page
    .getByRole('textbox', { name: 'Steps' })
    .fill(PELTILEIPA.steps.join('\n'))
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/\/recipes\/\d+$/)
  await expect(
    page.getByRole('heading', { name: PELTILEIPA.title }),
  ).toBeVisible()
})

test('a recipe is imported from a link', async ({ page }) => {
  const dialog = await openAddDialog(page)
  await dialog
    .getByRole('textbox', { name: 'Link to a recipe' })
    .fill(`${testSite}/resepti`)
  await dialog.getByRole('button', { name: 'Import' }).click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
})

test('settings say installing needs HTTPS', async ({ page }) => {
  await page.goto('/settings')
  await expect(
    page.getByText('Installing the app and using it offline need HTTPS.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Install' })).toBeDisabled()
})

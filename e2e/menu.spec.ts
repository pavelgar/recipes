import { expect, test } from '@playwright/test'

// Phones show the menu as a bottom bar and wider screens as a sidebar. Both
// are named "Main menu", and only one is shown at a time.
test('the main menu reaches every page', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('navigation', { name: 'Main menu' })

  for (const [name, path] of [
    ['Library', '/library'],
    ['Queue', '/queue'],
    ['Settings', '/settings'],
    ['Home', '/'],
  ] as const) {
    const link = menu.getByRole('link', { name })
    await link.click()
    await expect(page).toHaveURL(path)
    await expect(link).toHaveAttribute('aria-current', 'page')
  }
})

// Add opens a dialog over the page that was showing, with the link field
// ready for a link.
test('Add opens the add dialog over the page', async ({ page }) => {
  await page.goto('/library')
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('button', { name: 'Add' })
    .click()

  await expect(page.getByRole('dialog', { name: 'New recipe' })).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'Link to a recipe' }),
  ).toBeFocused()
  await expect(page).toHaveURL('/library')
})

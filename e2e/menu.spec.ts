import { expect, test } from '@playwright/test'

// Phones show the menu as a bottom bar and wider screens as a sidebar. Both
// are named "Main menu", and only one is shown at a time.
test('the main menu reaches every page', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('navigation', { name: 'Main menu' })

  for (const [name, path] of [
    ['Library', '/library'],
    ['Add', '/add'],
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

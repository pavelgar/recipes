import type { Page } from '@playwright/test'

// Opens the add dialog from the menu, on the page that's showing, or on
// Home if none is.
export async function openAddDialog(page: Page) {
  if (page.url() === 'about:blank') await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('button', { name: 'Add' })
    .click()
  return page.getByRole('dialog', { name: 'New recipe' })
}

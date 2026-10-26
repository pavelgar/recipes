import { expect, test } from '@playwright/test'
import { openAddDialog } from './app'
import { PELTILEIPA } from './recipes'
import { aiApp, testSite } from './servers'
import type { Page } from '@playwright/test'

// Imports from the pages of test-site.ts, which the e2e build's server
// reads as it reads any site's.

async function importLink(page: Page, link: string) {
  const dialog = await openAddDialog(page)
  const field = dialog.getByRole('textbox', { name: 'Link to a recipe' })
  await field.fill(link)
  await field.press('Enter')
  return dialog
}

test('a recipe from a link opens in the editor and saves with its source', async ({
  page,
}) => {
  const link = `${testSite}/resepti`
  await importLink(page, link)

  await expect(page).toHaveURL(`/add?link=${encodeURIComponent(link)}`)
  await expect(
    page.getByText('Read from Testisivu. Check it before saving.'),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
  await expect(page.getByRole('textbox', { name: 'Servings' })).toHaveValue(
    PELTILEIPA.servings,
  )
  await expect(page.getByRole('textbox', { name: 'Ingredients' })).toHaveValue(
    PELTILEIPA.ingredients.join('\n'),
  )
  await expect(page.getByRole('textbox', { name: 'Steps' })).toHaveValue(
    PELTILEIPA.steps.join('\n'),
  )
  // The page says it's in Finnish.
  await expect(
    page.getByRole('combobox', { name: 'Recipe language' }),
  ).toContainText('Finnish')

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/recipes\/\d+$/)
  await expect(page.getByRole('link', { name: 'Testisivu' })).toHaveAttribute(
    'href',
    link,
  )
})

test('a page without recipe data has no recipe to import', async ({ page }) => {
  const dialog = await importLink(page, `${testSite}/teksti`)
  await expect(
    dialog.getByText(
      'No recipe found on this page. You can enter it manually.',
    ),
  ).toBeVisible()
  await expect(page).toHaveURL('/')
})

test('refuses an address on a private network', async ({ page }) => {
  const dialog = await importLink(page, 'http://10.0.0.2/resepti')
  await expect(
    dialog.getByText("Can't import from a private network address."),
  ).toBeVisible()
})

test('says when the site cannot be reached', async ({ page }) => {
  // .invalid is reserved, and never resolves.
  const dialog = await importLink(page, 'https://recipes.invalid/resepti')
  await expect(dialog.getByText("Couldn't reach")).toBeVisible()
})

for (const [path, message] of [
  ['/puuttuu', "This page wasn't found on"],
  ['/estetty', 'Import blocked by'],
  // A 429 would read as a site to try later, but it's a browser check.
  ['/tarkistus', 'Import blocked by'],
  ['/resepti.pdf', 'This link leads to a file, not a recipe page.'],
] as const) {
  test(`${path} says why it can't be imported`, async ({ page }) => {
    const dialog = await importLink(page, `${testSite}${path}`)
    await expect(dialog.getByText(message)).toBeVisible()
  })
}

test.describe('with an AI model', () => {
  test.use({ baseURL: aiApp })

  test('a page without recipe data can be read with AI', async ({ page }) => {
    const link = `${testSite}/teksti`
    const dialog = await importLink(page, link)
    await expect(
      dialog.getByText(
        'This page has no recipe data. You can read it with AI, or enter it manually.',
      ),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Read with AI' }).click()

    await expect(page).toHaveURL(`/add?link=${encodeURIComponent(link)}`)
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
      PELTILEIPA.title,
    )
    await expect(
      page.getByText(
        'Marked lines are written differently in the source. Check them.',
      ),
    ).toBeVisible()
  })
})

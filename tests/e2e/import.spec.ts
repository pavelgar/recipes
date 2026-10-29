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

// The photo is the title's, so it has no name of its own.
const naturalWidth = (page: Page, photo: string) =>
  page
    .locator(photo)
    .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)

test('a recipe from a link comes with the largest photo its data gives', async ({
  page,
}) => {
  await importLink(page, `${testSite}/kuvalla`)

  // Stored at most 1600 px wide, so from the 2400 px photo, not the 800.
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible()
  await expect.poll(() => naturalWidth(page, 'form img')).toBe(1600)

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/recipes\/\d+$/)
  await expect.poll(() => naturalWidth(page, 'article img')).toBe(1600)
})

test("a photo that can't be fetched leaves the recipe without one", async ({
  page,
}) => {
  await importLink(page, `${testSite}/kuva-puuttuu`)

  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
    PELTILEIPA.title,
  )
  await expect(page.getByRole('button', { name: 'Add photo' })).toBeVisible()
  await expect(page.locator('form img')).toHaveCount(0)
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

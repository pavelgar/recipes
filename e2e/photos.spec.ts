import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import type { Page } from '@playwright/test'

// Adds a photo of one colour, as a phone saves it.
async function addPhoto(page: Page) {
  const buffer = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: '#c0603a' },
  })
    .jpeg()
    .toBuffer()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add photo' }).click()
  const files = await chooser
  await files.setFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer })
}

// From the corpus: https://kotiliesi.fi/resepti/etikkasilakat/
async function save(page: Page) {
  await page.getByRole('textbox', { name: 'Title' }).fill('Etikkasilakat')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/recipes\/\d+$/)
}

// The photo is the title's, so it has no name of its own.
const coverOf = (page: Page) => page.locator('article img')

test('a typed recipe keeps the photo added to it', async ({ page }) => {
  await page.goto('/add')
  await addPhoto(page)
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible()
  await save(page)

  // Stored at most 1600 px wide.
  const cover = coverOf(page)
  await expect(cover).toBeVisible()
  await expect
    .poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1600)
})

test('a removed photo comes back with Undo, and stays out when saved', async ({
  page,
}) => {
  await page.goto('/add')
  await addPhoto(page)
  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByRole('button', { name: 'Add photo' })).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible()

  await page.getByRole('button', { name: 'Remove photo' }).click()
  await save(page)
  await expect(
    page.getByRole('heading', { name: 'Etikkasilakat' }),
  ).toBeVisible()
  await expect(coverOf(page)).toHaveCount(0)
})

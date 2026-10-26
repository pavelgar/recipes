import { rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import type { Page } from '@playwright/test'

type Chosen = { name: string; mimeType: string; buffer: Buffer }

// Of one colour, as a phone or a scanner saves it.
const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#c0603a' } })

// Chooses a file with the photo's button: Add photo or Change photo.
async function choose(page: Page, button: string, file: Chosen) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: button }).click()
  await (await chooser).setFiles(file)
}

async function addPhoto(page: Page) {
  const buffer = await image(2400, 1800).jpeg().toBuffer()
  await choose(page, 'Add photo', {
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer,
  })
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

test("a file the app can't use leaves the removed photo's Undo", async ({
  page,
}) => {
  await page.goto('/add')
  await addPhoto(page)
  await page.getByRole('button', { name: 'Remove photo' }).click()

  // A TIFF, which no phone or site sends.
  const buffer = await image(40, 30).tiff().toBuffer()
  await choose(page, 'Add photo', {
    name: 'scan.tif',
    mimeType: 'image/tiff',
    buffer,
  })
  // The message lies over the toast with Undo, which shows once the toasts
  // spread out.
  await page.getByRole('dialog', { name: "This file can't be used." }).hover()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible()
})

test("a photo over 20 MB is refused before it's sent", async ({ page }) => {
  await page.goto('/add')
  const sent: Array<string> = []
  page.on('request', (request) => {
    const type = request.headers()['content-type'] ?? ''
    if (type.startsWith('multipart/form-data')) sent.push(request.url())
  })

  await choose(page, 'Add photo', {
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(20_000_001),
  })
  await expect(page.getByText('This photo is too large to add.')).toBeVisible()
  expect(sent).toEqual([])
})

test('a recipe whose photo is gone is saved without it', async ({ page }) => {
  await page.goto('/add')
  await addPhoto(page)

  // Its file goes, as when the photos folder is lost. playwright.config.ts
  // gives the server e2e-photos.
  const src = await page.locator('form img').getAttribute('src')
  if (!src) throw new Error('No photo shown')
  await rm(join('e2e-photos', basename(src)))

  await save(page)
  await expect(
    page.getByRole('heading', { name: 'Etikkasilakat' }),
  ).toBeVisible()
  await expect(coverOf(page)).toHaveCount(0)
})

// Anyone on the network can call the server, not only the app's pages.
test('the server refuses a call larger than any the app makes', async ({
  request,
}) => {
  const response = await request.post('/_serverFn/uploadPhoto', {
    // What the app's own pages send, which any other client can send too.
    headers: { 'sec-fetch-site': 'same-origin' },
    data: Buffer.alloc(21_000_001),
  })
  expect(response.status()).toBe(413)
})

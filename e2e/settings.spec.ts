import { expect, test } from '@playwright/test'

// Outside the US, a device starts on metric until someone picks units.
test.use({ timezoneId: 'Europe/Helsinki' })

test('settings keep the language and units chosen on the device', async ({
  page,
}) => {
  await page.goto('/settings')
  const language = page.getByRole('combobox', { name: 'Language' })
  await expect(language).toContainText('English')
  const units = page.getByRole('combobox', { name: 'Units' })
  await expect(units).toContainText('Metric')

  await units.click()
  await page.getByRole('option', { name: 'US', exact: true }).click()
  await expect(units).toContainText('US')

  // Switching the language reloads the page in it.
  await language.click()
  await page.getByRole('option', { name: 'Suomi' }).click()
  await expect(page.getByRole('heading', { name: 'Asetukset' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Kieli' })).toContainText(
    'Suomi',
  )
  await expect(
    page.getByRole('combobox', { name: 'Mittayksiköt' }),
  ).toContainText('Yhdysvaltalaiset')
})

test('the theme follows the device until one is picked', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/settings')
  const html = page.locator('html')
  await expect(html).toHaveClass(/\bdark\b/)

  const theme = page.getByRole('combobox', { name: 'Theme' })
  await expect(theme).toContainText('System')
  await theme.click()
  await page.getByRole('option', { name: 'Light' }).click()
  await expect(html).not.toHaveClass(/\bdark\b/)

  await page.reload()
  await expect(html).not.toHaveClass(/\bdark\b/)
  await expect(theme).toContainText('Light')
})

test('a build outside CI shows it is a development version', async ({
  page,
}) => {
  await page.goto('/settings')
  await expect(
    page.getByText('Development version', { exact: true }),
  ).toBeVisible()
})

test('settings link to the source code', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByRole('link', { name: /Source code/ })).toHaveAttribute(
    'href',
    'https://github.com/pavelgar/recipes',
  )
})

test.describe('installing the app', () => {
  // The browser's own offers of its install dialog are kept out, so each
  // test decides whether there is one. A test's own offer isn't trusted, so
  // it gets through.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.addEventListener(
        'beforeinstallprompt',
        (event) => {
          if (event.isTrusted) event.stopImmediatePropagation()
        },
        true,
      )
    })
  })

  test('Install opens the browser install dialog once', async ({ page }) => {
    await page.goto('/settings')
    const help = page.getByText("Open the browser's menu")
    await expect(help).toBeVisible()

    await page.evaluate(() => {
      const offer = Object.assign(new Event('beforeinstallprompt'), {
        prompt: () => {
          document.body.dataset.installDialog = 'opened'
          return Promise.resolve({ outcome: 'accepted' })
        },
      })
      window.dispatchEvent(offer)
    })
    await page.getByRole('button', { name: 'Install' }).click()
    await expect(page.locator('body')).toHaveAttribute(
      'data-install-dialog',
      'opened',
    )
    await expect(help).toBeVisible()
  })

  test('the installed app says it is installed', async ({ page }) => {
    // Set by Safari on iPhone in an app opened from the home screen.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { value: true })
    })
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: 'Installed' })).toBeDisabled()
  })
})

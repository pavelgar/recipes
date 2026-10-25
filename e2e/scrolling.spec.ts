import { expect, test } from '@playwright/test'

// In a phone's browser the page scrolls, and on wider screens the screen's
// scroll area does. A phone scrolls by touch, but the wheel goes the same
// way. The window is short, so Settings has something to scroll.
test('a screen longer than the window scrolls', async ({ page }) => {
  await page.setViewportSize({ ...page.viewportSize()!, height: 400 })
  await page.goto('/settings')
  const sourceCode = page.getByRole('link', { name: /Source code/ })
  await expect(sourceCode).not.toBeInViewport()

  await page.getByRole('heading', { name: 'Settings' }).hover()
  await page.mouse.wheel(0, 2000)
  await expect(sourceCode).toBeInViewport()
})

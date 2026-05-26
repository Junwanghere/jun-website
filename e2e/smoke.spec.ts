import { test, expect } from '@playwright/test'

test('首頁回 200 且有 html 標籤', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toBeVisible()
})

import { test, expect } from '@playwright/test'
import { resetCovers } from './fixtures/seed'

test.beforeEach(async () => {
  await resetCovers()
})

test('未登入訪問 /admin 被導向 /login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login$/)
})

test('登入 → 新增翻唱 → 在公開頁看到', async ({ page }) => {
  await page.goto('/login')
  // Dismiss the Next.js dev-tools overlay if it appears (ThemeProvider console warning)
  await page.keyboard.press('Escape')
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!)
  await page.getByLabel('密碼').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: '登入' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/covers/new')
  await page.getByLabel('歌名').fill('測試曲')
  await page.getByLabel('原唱').fill('測試原唱')
  await page.getByLabel('發布日').fill('2026-05-26')
  await page.locator('input[placeholder="https://..."]').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: '儲存' }).click()
  await expect(page).toHaveURL(/\/admin\/covers$/)
  await expect(page.getByText('測試曲')).toBeVisible()

  await page.goto('/covers')
  await expect(page.getByText('測試曲')).toBeVisible()
})

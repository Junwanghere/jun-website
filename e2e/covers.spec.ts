import { test, expect } from '@playwright/test'
import { resetCovers, seedCovers } from './fixtures/seed'

test.beforeEach(async () => {
  await resetCovers()
  await seedCovers()
})

test('翻唱列表顯示所有翻唱', async ({ page }) => {
  await page.goto('/covers')
  await expect(page.getByText('3 首')).toBeVisible()
  await expect(page.getByText('交換餘生')).toBeVisible()
  await expect(page.getByText('小酒窩')).toBeVisible()
  await expect(page.getByText('說好的幸福呢')).toBeVisible()
})

test('搜尋過濾原唱', async ({ page }) => {
  await page.goto('/covers')
  await page.getByPlaceholder('搜尋歌名或原唱⋯').fill('林')
  await page.keyboard.press('Enter')
  await expect(page.getByText('交換餘生')).toBeVisible()
  await expect(page.getByText('小酒窩')).toBeVisible()
  await expect(page.getByText('說好的幸福呢')).toBeHidden()
})

test('依平台篩選只顯示 Threads 的', async ({ page }) => {
  await page.goto('/covers')
  await page.getByRole('button', { name: 'Threads' }).click()
  await expect(page.getByText('說好的幸福呢')).toBeVisible()
  await expect(page.getByText('小酒窩')).toBeHidden()
})

test('點卡片進詳情頁', async ({ page }) => {
  await page.goto('/covers')
  await page.getByText('交換餘生').click()
  await expect(page.locator('h1', { hasText: '交換餘生' })).toBeVisible()
  await expect(page.locator('iframe')).toBeVisible()
})

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

test('原唱 filter 點 top 1 過濾出該原唱的翻唱', async ({ page }) => {
  await page.goto('/covers')
  // 既有 seed 三位原唱各 1 首；top 3 順序依 cover_count desc + name asc：周杰倫、林俊傑、林宥嘉
  // 點任一個 pill 都會過濾出對應的翻唱
  await page.getByRole('button', { name: '林宥嘉' }).click()
  await expect(page.getByText('交換餘生')).toBeVisible()
  await expect(page.getByText('小酒窩')).toBeHidden()
  await expect(page.getByText('說好的幸福呢')).toBeHidden()

  await page.getByRole('button', { name: '全部' }).click()
  await expect(page.getByText('交換餘生')).toBeVisible()
  await expect(page.getByText('小酒窩')).toBeVisible()
  await expect(page.getByText('說好的幸福呢')).toBeVisible()
})

test('DB 空時 filter row 隱藏，列表顯示 empty state', async ({ page }) => {
  await resetCovers() // 覆寫 beforeEach 的 seed
  await page.goto('/covers')
  await expect(page.getByText('0 首')).toBeVisible()
  await expect(page.getByRole('button', { name: '全部' })).not.toBeAttached()
  await expect(page.getByText('還沒有符合條件的翻唱')).toBeVisible()
})

test('點卡片標題進詳情頁', async ({ page }) => {
  await page.goto('/covers')
  await page.getByRole('link', { name: '〈交換餘生〉' }).click()
  await expect(page.locator('h1', { hasText: '交換餘生' })).toBeVisible()
  await expect(page.locator('iframe')).toBeVisible()
})

test('排序：最新 / 最舊 切換改變第一張卡片', async ({ page }) => {
  await page.goto('/covers')

  const firstNewest = await page.locator('article h3').first().innerText()

  await page.getByRole('button', { name: '最舊' }).click()
  await expect(page).toHaveURL(/sort=oldest/)

  const firstOldest = await page.locator('article h3').first().innerText()
  expect(firstOldest).not.toBe(firstNewest)

  await page.getByRole('button', { name: '最新' }).click()
  await expect(page).not.toHaveURL(/sort=oldest/)
  await expect(page.locator('article h3').first()).toHaveText(firstNewest)
})

test('icon link 設定為新分頁開啟、href 指向平台 URL', async ({ page }) => {
  await page.goto('/covers')
  const ytLink = page.getByRole('link', { name: '在 YouTube 觀看' }).first()
  // 攜帶 target=_blank 與正確 href 即為符合 spec；瀏覽器處理新分頁開啟是其職責，
  // 不在我們 app 的 contract 範圍。實際開啟行為在 Task 12 的手動體驗清單驗收。
  await expect(ytLink).toHaveAttribute('target', '_blank')
  await expect(ytLink).toHaveAttribute('rel', /noreferrer/)
  await expect(ytLink).toHaveAttribute('href', /youtu/)
})

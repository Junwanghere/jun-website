# 翻唱列表功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/covers` 加上最新／最舊排序 UI、歌名以單書名號 〈〉 純顯示、以及載入骨架（首次載入＋切換搜尋/排序/篩選時）。

**Architecture:** 沿用既有「URL 參數 + `router.push`」的 client 控制元件模式。骨架以「結果區抽成 async server component + 以 `q|artist|sort` 為 key 的 `<Suspense>`」實現——key 改變建立新邊界，即使在 transition 中也會顯示 fallback；`cursor`（載入更多）不入 key，維持其按鈕 loading。

**Tech Stack:** Next.js 16 App Router、React 19、Tailwind v4、shadcn `Skeleton`（純 `animate-pulse`，無第三方套件）、Vitest + Testing Library、Playwright。

**Spec:** `docs/superpowers/specs/2026-06-15-covers-list-features-design.md`

---

## File Structure

新增：
- `lib/covers/format.ts` — `formatSongTitle()` 純函式
- `components/filter-pill.tsx` — 共用 pill（排序、原唱共用）
- `components/sort-pills.tsx` — 最新／最舊排序控制
- `components/cover-card-skeleton.tsx` — `CoverCardSkeleton` + `CoverGridSkeleton`
- `components/cover-results.tsx` — async 結果區（listCovers + 清單 + 計數 + 載入更多）
- `app/covers/loading.tsx` — 路由層首次載入骨架

修改：
- `components/artist-filter-pills.tsx` — 改用 `FilterPill`
- `components/cover-card.tsx` — 歌名包 〈〉
- `app/covers/[id]/page.tsx` — 歌名包 〈〉（h1 + iframe title）
- `app/covers/page.tsx` — 拆出結果區、加排序 pill、加 Suspense
- `e2e/covers.spec.ts` — 新增排序測試、更新受 〈〉 影響的斷言

---

## Task 1: `formatSongTitle` 純函式

**Files:**
- Create: `lib/covers/format.ts`
- Test: `tests/lib/format.test.ts`

- [ ] **Step 1: 寫失敗測試**

`tests/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatSongTitle } from '@/lib/covers/format'

describe('formatSongTitle', () => {
  it('一般歌名包上單書名號', () => {
    expect(formatSongTitle('台北某個地方')).toBe('〈台北某個地方〉')
  })

  it('已以 〈 開頭者不重複包', () => {
    expect(formatSongTitle('〈牽掛〉')).toBe('〈牽掛〉')
  })

  it('空字串或純空白原樣回傳', () => {
    expect(formatSongTitle('')).toBe('')
    expect(formatSongTitle('   ')).toBe('   ')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- format`
Expected: FAIL（`formatSongTitle` 未定義 / 模組不存在）

- [ ] **Step 3: 實作**

`lib/covers/format.ts`:
```ts
/** 純顯示用：把歌名包上單書名號 〈〉。資料層不使用此函式。 */
export function formatSongTitle(title: string): string {
  if (!title.trim()) return title
  if (title.startsWith('〈')) return title
  return `〈${title}〉`
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- format`
Expected: PASS（3 個案例）

- [ ] **Step 5: Commit**

```bash
git add lib/covers/format.ts tests/lib/format.test.ts
git commit -m "feat(covers): add formatSongTitle helper (display-only 〈〉)"
```

---

## Task 2: 套用 〈〉 於卡片與詳情頁

**Files:**
- Modify: `components/cover-card.tsx`
- Modify: `app/covers/[id]/page.tsx:29` 與 `:39`
- Test: `tests/components/cover-card.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`tests/components/cover-card.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CoverCard } from '@/components/cover-card'
import type { CoverWithLinks } from '@/lib/covers/types'

const cover: CoverWithLinks = {
  id: 'abc',
  title: '台北某個地方',
  original_artist: '陳綺貞',
  cover_date: '2026-05-25',
  thumbnail_url: null,
  description: null,
  tags: [],
  created_at: '',
  updated_at: '',
  cover_links: [],
}

describe('CoverCard', () => {
  it('歌名以 〈〉 呈現，且連結到詳情頁', () => {
    render(<CoverCard cover={cover} />)
    const link = screen.getByRole('link', { name: '〈台北某個地方〉' })
    expect(link).toHaveAttribute('href', '/covers/abc')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- cover-card`
Expected: FAIL（找不到 name 為 `〈台北某個地方〉` 的連結，目前是純文字）

- [ ] **Step 3: 實作 — `components/cover-card.tsx`**

在檔案頂部 import：
```tsx
import { formatSongTitle } from '@/lib/covers/format'
```
把連結文字 `{cover.title}` 改為：
```tsx
{formatSongTitle(cover.title)}
```

- [ ] **Step 4: 實作 — `app/covers/[id]/page.tsx`**

在檔案頂部 import：
```tsx
import { formatSongTitle } from '@/lib/covers/format'
```
第 29 行的 `<h1>` 改為：
```tsx
<h1 className="text-2xl font-bold">{formatSongTitle(cover.title)}</h1>
```
第 39 行的 iframe `title` 改為：
```tsx
title={`${formatSongTitle(cover.title)} 翻唱`}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `pnpm test -- cover-card`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/cover-card.tsx "app/covers/[id]/page.tsx" tests/components/cover-card.test.tsx
git commit -m "feat(covers): wrap song titles in 〈〉 on card and detail page"
```

---

## Task 3: 抽出共用 `FilterPill` 並重構原唱篩選

**Files:**
- Create: `components/filter-pill.tsx`
- Modify: `components/artist-filter-pills.tsx`
- Test: `tests/components/filter-pill.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`tests/components/filter-pill.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FilterPill } from '@/components/filter-pill'

describe('FilterPill', () => {
  it('active 時 aria-pressed 為 true', () => {
    render(<FilterPill label="最新" active onClick={() => {}} />)
    expect(screen.getByRole('button', { name: '最新' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('點擊觸發 onClick', async () => {
    const onClick = vi.fn()
    render(<FilterPill label="最舊" active={false} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: '最舊' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- filter-pill`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `components/filter-pill.tsx`**

```tsx
import { cn } from '@/lib/utils'

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground shadow-sm hover:shadow',
      )}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- filter-pill`
Expected: PASS

- [ ] **Step 5: 重構 `components/artist-filter-pills.tsx`**

刪除檔案內自有的 `Pill` 函式，改 import 並使用共用元件。完整檔案改為：
```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterPill } from '@/components/filter-pill'

export function ArtistFilterPills({
  topArtists,
  active,
}: {
  topArtists: string[]
  active?: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  function set(name?: string) {
    const sp = new URLSearchParams(params)
    if (name) sp.set('artist', name)
    else sp.delete('artist')
    sp.delete('cursor')
    router.push(`/covers?${sp.toString()}`)
  }

  if (topArtists.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterPill label="全部" active={!active} onClick={() => set(undefined)} />
      {topArtists.map((name) => (
        <FilterPill key={name} label={name} active={name === active} onClick={() => set(name)} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: 跑全部測試確認無回歸**

Run: `pnpm test`
Expected: PASS（全綠）

- [ ] **Step 7: Commit**

```bash
git add components/filter-pill.tsx components/artist-filter-pills.tsx tests/components/filter-pill.test.tsx
git commit -m "refactor(covers): extract shared FilterPill from artist filter"
```

---

## Task 4: `SortPills` 元件

**Files:**
- Create: `components/sort-pills.tsx`
- Test: `tests/components/sort-pills.test.tsx`

（本任務只建立並測試元件；接到頁面在 Task 6 一次完成，避免重複改 `page.tsx`。）

- [ ] **Step 1: 寫失敗測試**

`tests/components/sort-pills.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ push: vi.fn(), params: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push }),
  useSearchParams: () => new URLSearchParams(h.params),
}))

import { SortPills } from '@/components/sort-pills'

describe('SortPills', () => {
  beforeEach(() => {
    h.push.mockClear()
    h.params = ''
  })

  it('sort=newest 時「最新」為 active', () => {
    render(<SortPills active="newest" />)
    expect(screen.getByRole('button', { name: '最新' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '最舊' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('點「最舊」帶 sort=oldest 並清掉 cursor', async () => {
    h.params = 'cursor=20'
    render(<SortPills active="newest" />)
    await userEvent.click(screen.getByRole('button', { name: '最舊' }))
    expect(h.push).toHaveBeenCalledWith('/covers?sort=oldest')
  })

  it('點「最新」移除 sort 參數', async () => {
    h.params = 'sort=oldest'
    render(<SortPills active="oldest" />)
    await userEvent.click(screen.getByRole('button', { name: '最新' }))
    expect(h.push).toHaveBeenCalledWith('/covers?')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- sort-pills`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `components/sort-pills.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterPill } from '@/components/filter-pill'
import type { CoverSort } from '@/lib/covers/types'

export function SortPills({ active }: { active: CoverSort }) {
  const router = useRouter()
  const params = useSearchParams()

  function set(sort: CoverSort) {
    const sp = new URLSearchParams(params)
    if (sort === 'oldest') sp.set('sort', 'oldest')
    else sp.delete('sort')
    sp.delete('cursor')
    router.push(`/covers?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterPill label="最新" active={active === 'newest'} onClick={() => set('newest')} />
      <FilterPill label="最舊" active={active === 'oldest'} onClick={() => set('oldest')} />
    </div>
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- sort-pills`
Expected: PASS（3 個案例）

- [ ] **Step 5: Commit**

```bash
git add components/sort-pills.tsx tests/components/sort-pills.test.tsx
git commit -m "feat(covers): add SortPills (newest/oldest) control"
```

---

## Task 5: 骨架元件與路由層 loading

**Files:**
- Create: `components/cover-card-skeleton.tsx`
- Create: `app/covers/loading.tsx`
- Test: `tests/components/cover-card-skeleton.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`tests/components/cover-card-skeleton.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CoverGridSkeleton } from '@/components/cover-card-skeleton'

describe('CoverGridSkeleton', () => {
  it('渲染指定數量的骨架卡', () => {
    render(<CoverGridSkeleton count={3} />)
    expect(screen.getByTestId('cover-grid-skeleton').children).toHaveLength(3)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- cover-card-skeleton`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `components/cover-card-skeleton.tsx`**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function CoverCardSkeleton() {
  return (
    <div className="bg-card flex gap-3 rounded-2xl p-3 shadow-sm md:flex-col md:gap-2">
      <Skeleton className="aspect-video w-32 shrink-0 rounded-xl md:w-full" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function CoverGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <ul
      className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3"
      aria-hidden
      data-testid="cover-grid-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <CoverCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: 實作 `app/covers/loading.tsx`**

```tsx
import { CoverGridSkeleton } from '@/components/cover-card-skeleton'

export default function Loading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        <CoverGridSkeleton />
      </div>
    </main>
  )
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `pnpm test -- cover-card-skeleton`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/cover-card-skeleton.tsx app/covers/loading.tsx tests/components/cover-card-skeleton.test.tsx
git commit -m "feat(covers): add skeleton card/grid and route-level loading"
```

---

## Task 6: 抽出 `CoverResults` 並在 page 加 Suspense + 排序 pill

**Files:**
- Create: `components/cover-results.tsx`
- Modify: `app/covers/page.tsx`

- [ ] **Step 1: 實作 `components/cover-results.tsx`**

```tsx
import { CoverCard } from '@/components/cover-card'
import { LoadMoreButton } from '@/components/load-more-button'
import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery } from '@/lib/covers/types'

export async function CoverResults({ query }: { query: CoverQuery }) {
  const { items, total, hasMore } = await listCovers(query)

  return (
    <>
      <div className="mb-3 flex justify-end">
        <span className="text-primary text-sm font-bold">{total} 首</span>
      </div>

      <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {items.length === 0 ? (
          <li className="bg-card text-muted-foreground rounded-2xl p-6 text-center text-sm md:col-span-2 lg:col-span-3">
            還沒有符合條件的翻唱
          </li>
        ) : (
          items.map((c) => (
            <li key={c.id}>
              <CoverCard cover={c} />
            </li>
          ))
        )}
      </ul>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <LoadMoreButton currentOffset={query.offset} limit={query.limit} />
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: 改寫 `app/covers/page.tsx`**

完整檔案改為：
```tsx
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { SearchInput } from '@/components/search-input'
import { SortPills } from '@/components/sort-pills'
import { ArtistFilterPills } from '@/components/artist-filter-pills'
import { CoverResults } from '@/components/cover-results'
import { CoverGridSkeleton } from '@/components/cover-card-skeleton'
import { getTopOriginalArtists } from '@/lib/covers/queries'
import { parseSearchParams } from '@/lib/covers/search-params'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function CoversPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const query = parseSearchParams(params)
  const topArtists = await getTopOriginalArtists(3)
  const suspenseKey = `${query.q ?? ''}|${query.artist ?? ''}|${query.sort}`

  return (
    <main className="min-h-dvh">
      {/* 上方標題區 */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回首頁
        </Link>
        <h1 className="mt-4 text-2xl font-bold">翻唱</h1>
      </div>

      {/* sticky 控制列：搜尋 + 排序 + 原唱 filter */}
      <div className="border-border bg-background sticky top-0 z-20 mt-3 border-b py-3">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="md:max-w-md">
            <SearchInput defaultValue={query.q} />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <SortPills active={query.sort} />
            <ArtistFilterPills topArtists={topArtists} active={query.artist} />
          </div>
        </div>
      </div>

      {/* 結果區：key 隨 q|artist|sort 改變 → 切換時顯示骨架；cursor 不入 key */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        <Suspense key={suspenseKey} fallback={<CoverGridSkeleton count={query.limit} />}>
          <CoverResults query={query} />
        </Suspense>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: 型別與 build 檢查**

Run: `pnpm build`
Expected: 編譯成功、TypeScript 無錯誤、`/covers` 仍列為動態路由

- [ ] **Step 4: 手動驗證（本機）**

確保本機 Supabase 在跑且已 `pnpm db:reset`，啟動 `pnpm dev`，在瀏覽器確認（注意 dev server 可能用 3000 以外的埠）：
1. 進入 `/covers` 首次載入時看到骨架卡片，隨後換成真實清單。
2. 歌名顯示為 `〈…〉`。
3. 點「最舊」→ 清單順序反轉、網址出現 `?sort=oldest`、切換瞬間出現骨架。
4. 點原唱 pill 或搜尋 → 同樣短暫骨架。
5. 點「載入更多」→ **只有按鈕** 顯示「載入中⋯」，清單不整排洗成骨架。

- [ ] **Step 5: Commit**

```bash
git add components/cover-results.tsx app/covers/page.tsx
git commit -m "feat(covers): suspense skeleton on filter/sort/search + sort pills wired"
```

---

## Task 7: E2E 排序測試 + 受 〈〉 影響的斷言修正 + 最終驗證

**Files:**
- Modify: `e2e/covers.spec.ts`

- [ ] **Step 1: 更新詳情頁連結斷言以反映 〈〉**

在 `e2e/covers.spec.ts` 的 `點卡片標題進詳情頁` 測試，把第一個 selector 改為帶單書名號（h1 用 `hasText` 子字串比對，維持不變即可）：
```ts
test('點卡片標題進詳情頁', async ({ page }) => {
  await page.goto('/covers')
  await page.getByRole('link', { name: '〈交換餘生〉' }).click()
  await expect(page.locator('h1', { hasText: '交換餘生' })).toBeVisible()
  await expect(page.locator('iframe')).toBeVisible()
})
```

- [ ] **Step 2: 新增排序 E2E 測試**

在 `e2e/covers.spec.ts` 檔尾新增（沿用檔案既有的 `test` / `expect` import 與 `beforeEach` 的 seed）：
```ts
test('排序：最新 / 最舊 切換改變第一張卡片', async ({ page }) => {
  await page.goto('/covers')

  // 預設最新：記錄第一張卡片標題
  const firstNewest = await page.locator('article h3').first().innerText()

  await page.getByRole('button', { name: '最舊' }).click()
  await expect(page).toHaveURL(/sort=oldest/)

  const firstOldest = await page.locator('article h3').first().innerText()
  expect(firstOldest).not.toBe(firstNewest)

  // 切回最新，網址不再帶 sort
  await page.getByRole('button', { name: '最新' }).click()
  await expect(page).not.toHaveURL(/sort=oldest/)
  await expect(page.locator('article h3').first()).toHaveText(firstNewest)
})
```

- [ ] **Step 3: 跑 E2E**

Run: `pnpm test:e2e`
Expected: 全部通過（含既有測試與新增的排序測試）

- [ ] **Step 4: 最終全量驗證**

Run（逐一）：
```bash
pnpm test
pnpm lint
pnpm format:check
pnpm build
```
Expected: 全部通過、無錯誤

- [ ] **Step 5: Commit**

```bash
git add e2e/covers.spec.ts
git commit -m "test(covers): e2e for sort toggle; fix detail-link assertion for 〈〉"
```

---

## 驗收對照（自我檢查）

- **功能 1 排序 UI**：Task 4（元件）+ Task 6（接入 page）+ Task 7（e2e）✓
- **功能 2 歌名 〈〉**：Task 1（helper）+ Task 2（卡片/詳情）✓
- **功能 3 骨架**：Task 5（骨架元件 + loading.tsx）+ Task 6（Suspense key）✓
- **共用 FilterPill 重構**：Task 3 ✓
- **不在範圍**：載入更多取代/累加（稍後另修）、功能 4 transform（另開 spec）

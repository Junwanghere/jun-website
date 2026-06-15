# 翻唱「載入更多」累加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/covers` 的「載入更多」改成預設 10 筆、點擊往尾端累加 10 筆、不導航、捲動位置不變。

**Architecture:** 初始 10 筆維持 server-render（`CoverResults`），之後由 client component `CoverList` 用 `useState` 累加；增量資料透過 Server Action `loadMoreCovers` 取得（內部呼叫既有 `listCovers`，其 `range` 視窗即「抓一批」，不需改）。不使用 URL `cursor`，所以沒有導航、捲動不跳。

**Tech Stack:** Next.js 16 App Router（Server Components / Server Actions）、React 19（`useState` / `useTransition` async transition）、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-06-15-covers-load-more-append-design.md`

---

## File Structure

新增：

- `lib/covers/actions.ts` — Server Action `loadMoreCovers(query)` 回傳一批 `CoverWithLinks[]`
- `components/cover-list.tsx` — client 元件，累加清單 + 載入更多按鈕（吸收原 LoadMoreButton）

修改：

- `lib/covers/search-params.ts` — `DEFAULT_LIMIT` 10、`offset` 固定 0、移除 `asOffset` 與無人使用的 `buildQueryString`
- `tests/lib/search-params.test.ts` — 更新 limit 期望值與 offset 行為
- `components/cover-results.tsx` — 改抓前 10 筆 + 渲染 `<CoverList>`

刪除：

- `components/load-more-button.tsx` — 由 `CoverList` 取代

---

## Task 1: search-params 改預設 10、offset 固定 0、移除死碼

**Files:**

- Modify: `lib/covers/search-params.ts`
- Test: `tests/lib/search-params.test.ts`

- [ ] **Step 1: 先改測試（TDD）— 將 `tests/lib/search-params.test.ts` 整檔改為**

```ts
import { describe, it, expect } from 'vitest'
import { parseSearchParams } from '@/lib/covers/search-params'

describe('parseSearchParams', () => {
  it('沒有參數時用預設值（每頁 10 筆、offset 0）', () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      artist: undefined,
      tag: undefined,
      sort: 'newest',
      limit: 10,
      offset: 0,
    })
  })

  it('解析 q / artist / tag / sort', () => {
    expect(
      parseSearchParams({ q: '林宥嘉', artist: '林宥嘉', tag: '抒情', sort: 'oldest' }),
    ).toMatchObject({
      q: '林宥嘉',
      artist: '林宥嘉',
      tag: '抒情',
      sort: 'oldest',
    })
  })

  it('artist 接受任意字串（白名單由 UI 控制，server 不擋）', () => {
    expect(parseSearchParams({ artist: '完全沒這個人' }).artist).toBe('完全沒這個人')
  })

  it('空字串 artist 視為 undefined', () => {
    expect(parseSearchParams({ artist: '' }).artist).toBeUndefined()
  })

  it('offset 永遠為 0（分頁改由客戶端累加，cursor 不再進 URL）', () => {
    expect(parseSearchParams({}).offset).toBe(0)
    expect(parseSearchParams({ cursor: '40' }).offset).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- search-params`
Expected: FAIL（目前 default limit 為 20、且 `cursor:'40'` 會得到 offset 40）

- [ ] **Step 3: 改 `lib/covers/search-params.ts` 整檔為**

```ts
import { type CoverQuery, type CoverSort } from './types'

const DEFAULT_LIMIT = 10

function asSort(v: unknown): CoverSort {
  return v === 'oldest' ? 'oldest' : 'newest'
}

export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
): CoverQuery {
  const get = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k])
  return {
    q: get('q') || undefined,
    artist: get('artist') || undefined,
    tag: get('tag') || undefined,
    sort: asSort(get('sort')),
    limit: DEFAULT_LIMIT,
    offset: 0,
  }
}
```

（移除了 `asOffset` 與 `buildQueryString`——後者全專案無任何呼叫處，是死碼。）

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- search-params`
Expected: PASS

- [ ] **Step 5: 確認沒有殘留 import 壞掉**

Run: `pnpm build`
Expected: 編譯成功、無 TypeScript 錯誤（確認沒有別處 import `buildQueryString`）

- [ ] **Step 6: Commit**

```bash
git add lib/covers/search-params.ts tests/lib/search-params.test.ts
git commit -m "refactor(covers): default page size 10, drop dead cursor/offset plumbing"
```

---

## Task 2: Server Action `loadMoreCovers`

**Files:**

- Create: `lib/covers/actions.ts`

（此檔為薄包裝，依賴 DB 的行為由 Task 3 的元件測試以 mock 驗證、最終以手動驗證；此處只建立並確認型別/編譯。）

- [ ] **Step 1: 建立 `lib/covers/actions.ts`**

```ts
'use server'

import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

/** 取得某一批翻唱（給「載入更多」的客戶端累加用）。 */
export async function loadMoreCovers(query: CoverQuery): Promise<CoverWithLinks[]> {
  const { items } = await listCovers(query)
  return items
}
```

- [ ] **Step 2: 確認編譯通過**

Run: `pnpm build`
Expected: 編譯成功、無 TypeScript 錯誤

- [ ] **Step 3: Commit**

```bash
git add lib/covers/actions.ts
git commit -m "feat(covers): add loadMoreCovers server action"
```

---

## Task 3: `CoverList` 客戶端累加元件

**Files:**

- Create: `components/cover-list.tsx`
- Test: `tests/components/cover-list.test.tsx`

- [ ] **Step 1: 寫失敗測試 `tests/components/cover-list.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ loadMore: vi.fn() }))
vi.mock('@/lib/covers/actions', () => ({
  loadMoreCovers: h.loadMore,
}))

import { CoverList } from '@/components/cover-list'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

function makeCover(id: string): CoverWithLinks {
  return {
    id,
    title: `歌-${id}`,
    original_artist: '原唱',
    cover_date: '2026-01-01',
    thumbnail_url: null,
    description: null,
    tags: [],
    created_at: '',
    updated_at: '',
    cover_links: [],
  }
}

const baseQuery: CoverQuery = {
  q: undefined,
  artist: undefined,
  tag: undefined,
  sort: 'newest',
  limit: 10,
  offset: 0,
}

describe('CoverList', () => {
  beforeEach(() => h.loadMore.mockReset())

  it('items 少於 total 時顯示「載入更多」', () => {
    render(
      <CoverList initialItems={[makeCover('1'), makeCover('2')]} total={4} baseQuery={baseQuery} />,
    )
    expect(screen.getByRole('button', { name: '載入更多' })).toBeInTheDocument()
  })

  it('initialItems 已達 total 時不顯示按鈕', () => {
    render(<CoverList initialItems={[makeCover('1')]} total={1} baseQuery={baseQuery} />)
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  })

  it('點「載入更多」用 offset=已顯示數 呼叫 action，append 後達 total 則按鈕消失', async () => {
    h.loadMore.mockResolvedValue([makeCover('3'), makeCover('4')])
    render(
      <CoverList initialItems={[makeCover('1'), makeCover('2')]} total={4} baseQuery={baseQuery} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '載入更多' }))

    expect(await screen.findByText(/歌-3/)).toBeInTheDocument()
    expect(screen.getByText(/歌-4/)).toBeInTheDocument()
    expect(h.loadMore).toHaveBeenCalledWith({ ...baseQuery, offset: 2 })
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test -- cover-list`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `components/cover-list.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { CoverCard } from '@/components/cover-card'
import { loadMoreCovers } from '@/lib/covers/actions'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

const GRID = 'flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3'

export function CoverList({
  initialItems,
  total,
  baseQuery,
}: {
  initialItems: CoverWithLinks[]
  total: number
  baseQuery: CoverQuery
}) {
  const [items, setItems] = useState(initialItems)
  const [pending, startTransition] = useTransition()
  const hasMore = items.length < total

  function onLoadMore() {
    startTransition(async () => {
      const next = await loadMoreCovers({ ...baseQuery, offset: items.length })
      setItems((prev) => [...prev, ...next])
    })
  }

  if (items.length === 0) {
    return (
      <ul className={GRID}>
        <li className="bg-card text-muted-foreground rounded-2xl p-6 text-center text-sm md:col-span-2 lg:col-span-3">
          還沒有符合條件的翻唱
        </li>
      </ul>
    )
  }

  return (
    <>
      <ul className={GRID}>
        {items.map((c) => (
          <li key={c.id}>
            <CoverCard cover={c} />
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={pending}
            className="bg-card text-primary rounded-full px-6 py-2.5 text-sm font-bold shadow-sm transition hover:shadow disabled:opacity-60"
          >
            {pending ? '載入中⋯' : '載入更多'}
          </button>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test -- cover-list`
Expected: PASS（3 個案例。`findByText` 會等 async transition 完成後的 append）

- [ ] **Step 5: Commit**

```bash
git add components/cover-list.tsx tests/components/cover-list.test.tsx
git commit -m "feat(covers): CoverList client component with append-based load more"
```

---

## Task 4: 接上 `CoverResults`、刪除 `LoadMoreButton`

**Files:**

- Modify: `components/cover-results.tsx`
- Delete: `components/load-more-button.tsx`

- [ ] **Step 1: 改寫 `components/cover-results.tsx` 整檔為**

```tsx
import { CoverList } from '@/components/cover-list'
import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery } from '@/lib/covers/types'

export async function CoverResults({ query }: { query: CoverQuery }) {
  const { items, total } = await listCovers(query)

  return (
    <>
      <div className="mb-3 flex justify-end">
        <span className="text-primary text-sm font-bold">{total} 首</span>
      </div>
      <CoverList initialItems={items} total={total} baseQuery={query} />
    </>
  )
}
```

- [ ] **Step 2: 刪除舊按鈕並確認無殘留引用**

```bash
git rm components/load-more-button.tsx
grep -rn "load-more-button\|LoadMoreButton" app components tests e2e
```

Expected: grep 無任何輸出（已無引用）

- [ ] **Step 3: 編譯 + 全量單元測試**

Run: `pnpm build` 然後 `pnpm test`
Expected: build 成功、`/covers` 仍為動態（ƒ）；所有單元測試通過

- [ ] **Step 4: Commit**

```bash
git add components/cover-results.tsx
git commit -m "feat(covers): wire CoverList into results; remove LoadMoreButton"
```

---

## Task 5: 手動驗證（含捲動不跳）＋最終驗證

**Files:** （無檔案變更；驗證與必要時的 e2e 確認）

- [ ] **Step 1: 還原本機真資料並啟動 dev server**

```bash
node scripts/seed-youtube-covers.mjs   # 確保本機有完整 120 首（e2e 可能洗成 3 筆）
pnpm dev
```

（dev server 可能用 3000 以外的埠，留意 log 輸出的實際埠號。）

- [ ] **Step 2: 手動確認（瀏覽器）**

1. 進入 `/covers`：初始顯示 **10 張**卡片，下方有「載入更多」。
2. 捲到「載入更多」按鈕、記住目前畫面位置；點一下。
3. 確認：清單**變成 20 張**（前 10 張仍在、後 10 張接在尾端），**網址沒有變化**，**畫面沒有跳回頂端 / 停在原位**。
4. 切換「最舊」或某個原唱 pill：清單回到該條件的前 10 筆、且切換時出現骨架。
5. 一直點到沒有更多時，「載入更多」按鈕消失。

- [ ] **Step 3: 既有 e2e 不回歸**

Run: `pnpm test:e2e`
Expected: 全部通過（seed 為 3 筆 < 10，列表一次顯示完，既有測試不受影響）。

- [ ] **Step 4: 最終全量驗證**

Run（逐一）：

```bash
pnpm test
pnpm lint
pnpm format:check
pnpm build
```

Expected: 全部通過。若 `format:check` 報未格式化，跑 `pnpm format` 修正後一併 commit。

- [ ] **Step 5: Commit（若有 format 變更）**

```bash
git add -A
git commit -m "chore(covers): formatting after load-more append"
```

（若沒有任何變更則略過此步。）

---

## 驗收對照（自我檢查）

- **需求 1：預設 10 筆** → Task 1（`DEFAULT_LIMIT = 10`）✓
- **需求 2：append +10、不 reload、捲動不跳** → Task 2（action）+ Task 3（CoverList `useState` 累加）+ Task 4（接線）+ Task 5（手動驗證捲動）✓
- **不在範圍**：自動化 load-more e2e（需 >10 筆 seed fixture）；以元件測 + 手動驗證涵蓋。

# 翻唱列表「載入更多」累加 — 設計文件

日期：2026-06-15
範圍：修正 `/covers` 的「載入更多」行為。取代先前用 URL `cursor` 重查、會**取代**清單並跳回頂端的做法。

## 背景與問題

目前 `LoadMoreButton` 把 `cursor` 設成 `offset+limit` 後 `router.push`，而 `listCovers` 用 `range(offset, offset+limit-1)` 取單一視窗，所以「載入更多」會**用下一頁取代現有清單**（只剩第 11–20 筆），且 `router.push` 預設捲回頂端。

## 需求

1. 預設顯示 **10 筆**（現為 20）。
2. 點「載入更多」往尾端**累加 10 筆**；**不 reload**、頁面**停留在原本捲動位置**。

## 方案（已選定）

**Server Action 客戶端 append。** 初始 10 筆維持 server-render（首屏與 SEO），之後的批次由 client state 累加，完全不導航 → 捲動不動、只抓增量。

### 資料流

```
app/covers/page.tsx (server；Suspense key = q|artist|sort)
  └─ CoverResults (server): listCovers({offset:0, limit:10}) → total + 前 10 筆
       ├─ 「{total} 首」計數（server 計算，維持現位置）
       └─ <CoverList initialItems={前10} total={total} baseQuery={query} /> (client)
            ├─ const [items, setItems] = useState(initialItems)
            ├─ items.map → <CoverCard>
            └─ 「載入更多」(顯示條件 hasMore = items.length < total)
                 └─ onClick → loadMoreCovers({ ...baseQuery, offset: items.length })  // Server Action
                      → 回傳下一批 → setItems(prev => [...prev, ...next])
                      → DOM 接尾端、無導航、捲動不動
```

切換 搜尋／排序／原唱：Suspense key 改變 → `CoverResults` 重新掛載 → `CoverList` 以新條件的前 10 筆重新初始化（useState 重置）→ 回到該條件第一頁，並照舊顯示骨架。

## 檔案

### 新增

**`lib/covers/actions.ts`**
```ts
'use server'
import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

export async function loadMoreCovers(query: CoverQuery): Promise<CoverWithLinks[]> {
  const { items } = await listCovers(query)
  return items
}
```
`listCovers` 既有的 `range(offset, offset+limit-1)` 視窗正好就是「抓某一批」，不需修改。

**`components/cover-list.tsx`**（`'use client'`）
- props：`initialItems: CoverWithLinks[]`、`total: number`、`baseQuery: CoverQuery`（offset 為 0、limit 為 10）。
- `const [items, setItems] = useState(initialItems)`；`const [pending, startTransition] = useTransition()`。
- `hasMore = items.length < total`。
- 空狀態（`items.length === 0`）：渲染與現行相同的「還沒有符合條件的翻唱」`<li>`（含 `md:col-span-2 lg:col-span-3`）。
- 載入更多：
  ```ts
  startTransition(async () => {
    const next = await loadMoreCovers({ ...baseQuery, offset: items.length })
    setItems((prev) => [...prev, ...next])
  })
  ```
  （React 19 的 `startTransition` 支援 async function，pending 維持到完成。）
- 按鈕沿用原 `LoadMoreButton` 的樣式與「載入中⋯」文案；`disabled={pending}`。

### 修改

**`components/cover-results.tsx`**（server）
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
（清單、空狀態、載入更多都移入 `CoverList`。）

**`lib/covers/search-params.ts`**
- `DEFAULT_LIMIT` 20 → **10**。
- `offset` 固定回傳 `0`（移除 `cursor`→offset 的讀取與 `asOffset` helper），避免手動 `?cursor=N` 造成初始批次錯位。`q / artist / tag / sort` 維持不變。
- `buildQueryString` 不再需要 `cursor` 分支；若該函式僅被測試使用，於計畫階段確認後一併移除其 `cursor` 分支（保持與「offset 不再進 URL」一致）。

### 刪除

**`components/load-more-button.tsx`** — 由 `CoverList` 內的按鈕取代。

## 保留（不動）

- 各 filter 元件（`sort-pills` / `artist-filter-pills` / `search-input`）裡的 `sp.delete('cursor')`：無害的防衛性 no-op，留著也讓 `sort-pills` 既有測試不變。
- Suspense key 仍為 `q|artist|sort`（不含 cursor/offset）。

## 測試

- **`CoverList`**（Vitest 元件測，mock `@/lib/covers/actions`）：
  - 起始 2 筆、`total=4` → 顯示「載入更多」。
  - 點擊後 mock 的 `loadMoreCovers` 回傳另 2 筆 → 畫面變 4 張卡、按鈕消失（`items.length === total`）。
  - 起始即 `items.length === total` → 不顯示按鈕。
- **`search-params`**（更新既有測試）：預設 `limit` 期望值 20 → 10；`offset` 在任何輸入下皆為 0（含帶 `cursor` 的情況）。
- **手動 / Playwright**：以完整 120 首資料，確認預設 10 筆、點一次變 20 筆、且點擊後視窗捲動位置不變（截圖前後對比）。

## 不在本次範圍

- 自動化的「載入更多」E2E（需要 seed 超過 10 筆的 fixture）；本次以元件測 + 手動驗證涵蓋。
- 後續可選清理：filter 元件殘留的 `delete('cursor')` 與 `buildQueryString` 的 `cursor` 分支若確認全無用途，另行移除。

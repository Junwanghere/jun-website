# 翻唱列表功能強化 — 設計文件

日期：2026-06-15
範圍：`/covers` 公開翻唱列表頁的三項功能。第四項（卡片點擊導頁的 transform 效果）另開 spec，待本批完成後再進行。

## 背景

`/covers` 已有：搜尋、原唱篩選 pill、載入更多、卡片列表。後端查詢 `listCovers` 已支援 `sort: 'newest' | 'oldest'`，`parseSearchParams` / `buildQueryString` 也已處理 `sort` URL 參數——但前台沒有切換排序的 UI。

本批要做三件事：排序 UI、歌名加單書名號、載入骨架（skeleton）。

## 功能 1：最新／最舊 排序 pill

**現況**：後端排序已完整，僅缺 UI。

**設計**：
- 新增 `components/sort-pills.tsx`：兩顆 pill「最新」「最舊」，client component，沿用既有 URL-param + `router.push` 模式。
  - 「最新」為預設：選它時移除 `sort` 參數；「最舊」設 `sort=oldest`。
  - 切換時一併 `delete('cursor')`（回到第一頁）。
  - `active` 狀態由 `query.sort` 決定。
- 放在 sticky 篩選列，原唱 pill 上方。
- **重構**：將目前內嵌於 `artist-filter-pills.tsx` 的 `Pill` 抽成共用元件 `components/filter-pill.tsx`，供排序與原唱兩處共用，避免重複。`FilterPill` props：`label: string`、`active: boolean`、`onClick: () => void`。

## 功能 2：歌名加單書名號 〈〉（純顯示）

**決策**：純顯示時包上，資料本身維持乾淨純文字（搜尋、後台編輯、JSON/DB 皆不變）。

**設計**：
- 新增 `lib/covers/format.ts`：
  ```ts
  export function formatSongTitle(title: string): string
  ```
  回傳 `〈${title}〉`；若 `title` 已以 `〈` 開頭則原樣回傳（防止重複包）；空字串／僅空白則原樣回傳（不包成空書名號）。純函式、易測。
- 套用於所有對外顯示歌名處：
  - `components/cover-card.tsx`：卡片 `<h3>` 連結文字。
  - `app/covers/[id]/page.tsx`：詳情頁主標題，以及該頁 `generateMetadata` 的 `<title>`（若有用到歌名）。
- **不套用**：後台 `/admin` 表單、搜尋比對邏輯、資料層。

## 功能 3：Skeleton 載入骨架

**決策**：首次進入 `/covers` 顯示，且切換搜尋／排序／原唱篩選時也顯示。載入更多維持原本的按鈕 loading（不在範圍）。

**技術背景**：篩選/搜尋/排序的導頁包在 `startTransition` 內，React 預設會「保留舊內容」而不顯示 fallback。為了在這些切換時也顯示骨架，採用「以查詢身分為 key 的 Suspense 邊界」——key 改變會建立全新邊界、無既有內容，因此即使在 transition 中也會顯示 fallback。

**設計**：
- 新增 `components/cover-card-skeleton.tsx`：用既有 `components/ui/skeleton.tsx`（純 Tailwind `animate-pulse`，無第三方套件）拼出對齊真實卡片的骨架（縮圖塊＋兩行文字＋一排 icon 佔位）。
- 新增 `app/covers/loading.tsx`：首次進入路由時顯示一格骨架網格（佈局對齊真實清單的 grid）。
- 新增 `components/cover-results.tsx`：async server component，負責呼叫 `listCovers(query)` 並渲染清單、載入更多、`{total} 首` 計數與空狀態。
- 修改 `app/covers/page.tsx`：
  - 保留並即時渲染篩選列（搜尋框、排序 pill、原唱 pill）。
  - 結果區改為：
    ```tsx
    <Suspense key={`${query.q ?? ''}|${query.artist ?? ''}|${query.sort}`} fallback={<CoverGridSkeleton count={query.limit} />}>
      <CoverResults query={query} />
    </Suspense>
    ```
  - key 僅由 `q | artist | sort` 組成（**不含 `cursor`**）→ 載入更多不會把整排洗成骨架，維持其按鈕 loading。
  - `getTopOriginalArtists` 仍於 page 取得供篩選列使用（與查詢無關、查詢快速，可接受）。

## 受影響檔案

新增：
- `components/sort-pills.tsx`
- `components/filter-pill.tsx`
- `lib/covers/format.ts`
- `components/cover-card-skeleton.tsx`（含網格包裝 `CoverGridSkeleton`）
- `components/cover-results.tsx`
- `app/covers/loading.tsx`

修改：
- `app/covers/page.tsx`（拆出結果區 + Suspense + 排序 pill）
- `components/artist-filter-pills.tsx`（改用共用 `FilterPill`）
- `components/cover-card.tsx`（歌名包 〈〉）
- `app/covers/[id]/page.tsx`（歌名包 〈〉，含 metadata）

## 測試

- **`formatSongTitle`**（Vitest 單元）：一般字串包上 〈〉；已含 〈 開頭者不重複包；空字串行為明確。
- **`SortPills`**（Vitest 元件）：active 狀態正確；點「最舊」會帶 `sort=oldest` 且清掉 `cursor`；點「最新」會移除 `sort`。
- **`CoverCard`**（既有/新增元件測）：標題以 〈〉 呈現、連結 href 正確。
- **E2E（Playwright）**：在 `/covers` 切換最新/最舊，確認順序改變；切換時骨架短暫出現（可用既有 e2e 模式驗證 DOM）。

## 不在本次範圍

- **載入更多的取代 vs 累加行為**：現以 offset 重查、會取代清單而非累加，疑似既有 bug；使用者已同意稍後另行修正，本批不更動其行為。
- **功能 4：卡片點擊導頁的 transform 效果**：本批完成後另開 spec 與計畫。

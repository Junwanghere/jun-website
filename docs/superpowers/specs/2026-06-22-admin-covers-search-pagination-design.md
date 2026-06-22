# Admin 翻唱管理：搜尋 + 數字分頁 + 草稿標籤 — 設計文件

日期：2026-06-22
範圍：改善 `/admin/covers` 翻唱管理頁的瀏覽體驗。三件事：(1) 草稿區操作鈕從「補資料」改回「編輯」；(2)「已發布」列表改成每頁 10 筆的數字分頁；(3) 新增搜尋列，查詢方式比照公開 `/covers`（比對歌名 + 原唱）。

## 背景與問題

目前 `/admin/covers` 一次撈 200 筆、在前端切成「草稿 / 已發布」兩堆全部列出。已發布累積到 ~120 首後一長串難找，且沒有搜尋。草稿區的操作鈕文案「補資料」使用者不喜歡，要統一成「編輯」。

## 需求

1. 草稿區與已發布區的操作鈕**一律顯示「編輯」**。
2. 已發布列表**每頁 10 筆**，用**數字頁碼 + 省略號**分頁（例：`1 … 4 5 6 … 12`）。
3. 新增**文字搜尋列**，輸入後過濾已發布列表，查詢邏輯比照 `/covers`（`title` / `original_artist` 做 ilike）。
4. 搜尋與分頁**只作用於「已發布」列表**；「待補草稿」區永遠釘在最上方，不受搜尋／分頁影響。
5. 公開頁（`/covers`、詳情頁、統計）行為完全不變。

## 方案（已選定）

### 資料層 `lib/covers/queries.ts`

`listCovers` 的 opts 加 `status?: 'draft' | 'published'`：

```
opts: { includeDrafts?: boolean; status?: 'draft' | 'published' }
// 狀態過濾：明確指定 status 優先；否則維持 fail-closed（預設只給 published）
if (opts.status) q = q.eq('status', opts.status)
else if (!opts.includeDrafts) q = q.eq('status', 'published')
```

公開呼叫端不傳 → 行為不變。Admin 用 `status` 分別查草稿與已發布，各自拿到正確的 `total`（count: 'exact' 已存在）。

### Admin 頁 `app/admin/covers/page.tsx`

從 `searchParams` 讀 `q` 與 `page`：

```
const page = Math.max(1, Number(get('page')) || 1)
const q = get('q') || undefined
const PAGE_SIZE = 10
```

兩個查詢：
- 草稿（全部、釘最上）：`listCovers({ sort:'newest', limit: 1000, offset: 0 }, { status: 'draft' })`
- 已發布（分頁 + 搜尋）：`listCovers({ q, sort:'newest', limit: PAGE_SIZE, offset: (page-1)*PAGE_SIZE }, { status: 'published' })`

版面（由上而下）：標題列（共 N 首＝已發布 total）→ 待補草稿區（若有）→ 搜尋列 → 已發布列表（當頁 10 筆）→ 數字分頁。

`CoverRow` 操作鈕移除 `status` 三元判斷，一律「編輯」。

搜尋無結果時顯示「找不到符合的翻唱」；無草稿時草稿區隱藏（同現狀）。

### 搜尋列 `app/admin/covers/cover-search.tsx`（新檔，client）

比照 `components/search-input.tsx` 的互動，但：導向 `/admin/covers`、提交時 `sp.delete('page')`（回第 1 頁）。不共用公開元件，避免改動牽動 `/covers`。

### 數字分頁

- 純函式 `lib/pagination.ts`：`paginationRange(current: number, totalPages: number): (number | '…')[]`
  - 顯示第 1 頁、最後一頁、目前頁 ±1，缺口補 `'…'`。
  - 邊界：totalPages ≤ 1 回 `[1]`（或空，由元件決定是否渲染）。
- 元件 `app/admin/covers/pagination.tsx`（server）：渲染 `<Link>`，每個頁碼保留目前 `q`，標記 current。totalPages = `Math.ceil(publishedTotal / PAGE_SIZE)`；≤ 1 頁時不渲染。

## 測試

- **單元（vitest）**：`paginationRange` — 少頁數不出現省略號、頭尾、中間、單頁/零頁邊界。
- **整合驗證**：本機 admin 實際操作 — 草稿釘最上、已發布分頁可翻、搜尋過濾且回第 1 頁、兩區操作鈕都是「編輯」；公開 `/covers` 不受影響。
- 現有測試需維持通過。

## 範圍外（YAGNI）

- ❌ 不對草稿區做搜尋/分頁（草稿少，釘最上即可）。
- ❌ 不加排序切換（admin 固定 newest）。
- ❌ 不改公開 `/covers` 的 load-more 機制。

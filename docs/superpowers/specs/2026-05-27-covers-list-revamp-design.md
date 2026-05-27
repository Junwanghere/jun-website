# /covers 列表頁改造設計文件

日期：2026-05-27
作者：王嘉駿（與 Claude 共同整理）
狀態：待使用者審閱

## 1. 概述

針對既有公開翻唱列表頁（`/covers`）的迭代調整，包含縮圖比例修正、響應式版型重做、篩選機制重整、平台標記改用 icon。屬於 Phase 1 之後的後續改進，非新功能。

設計原則：簡化（拿掉低鑑別力的平台 filter）、加強縮圖視覺、桌機善用空間（grid 版型）。

## 2. 範圍

**本次涵蓋**

- 縮圖比例從 1:1 改為 16:9
- 響應式版型：手機列表、tablet 2 col grid、桌機 3 col grid
- 拿掉平台 filter，新增原唱 filter（單選，全部 + Top 3）
- 卡片平台標記由文字（YT/IG/TH）改為 icon
- 新增 PostgreSQL view 供 top 3 原唱查詢使用
- 擴充平台 enum：新增 TikTok、抖音、小紅書三個官方值（後台表單下拉、icon mapping 跟著支援）

**非本次範圍**

- 後台 `/admin/covers` 列表的視覺調整（仍維持文字版型）
- 翻唱詳情頁 `/covers/[id]` 視覺調整
- 類型標籤（tags）filter UI（資料層仍保留支援）
- 排序方向 UI（資料層仍支援 newest/oldest，但 UI 不暴露）

## 3. 視覺與 RWD 規格

### 3.1 響應斷點與版型

| 區間 | 版型 | 卡片內部 | 縮圖尺寸 |
| --- | --- | --- | --- |
| `<768px` | 單欄列表（`flex flex-col gap-3`） | 左圖右文（`flex gap-3`） | `w-32` ≈ 128×72px（16:9） |
| `≥768px`（md） | 2 col grid（`md:grid md:grid-cols-2 md:gap-4`） | 上圖下文（`md:flex-col md:gap-2`） | `w-full`，`aspect-video` 自動 |
| `≥1024px`（lg） | 3 col grid（`lg:grid-cols-3`） | 同 md | 同 md |

### 3.2 容器

`app/covers/page.tsx` 主容器：

```
mx-auto w-full max-w-6xl px-4 py-6
```

搜尋輸入框另外限寬：`md:max-w-md`，避免桌機下太長。

### 3.3 卡片骨架（單一元件處理所有區間）

```tsx
<Link
  href={`/covers/${cover.id}`}
  className="flex gap-3 rounded-2xl bg-card p-3 shadow-sm transition hover:shadow-md md:flex-col md:gap-2"
>
  <div
    className="aspect-video w-32 shrink-0 rounded-xl bg-muted md:w-full"
    style={thumbnail_url ? { background: `center/cover no-repeat url('${thumbnail_url}')` } : undefined}
    aria-hidden
  />
  <div className="min-w-0 flex-1">
    <div className="truncate font-bold text-card-foreground">{title}</div>
    <div className="truncate text-xs text-muted-foreground">原唱 {original_artist} · {cover_date}</div>
    <div className="mt-1.5 flex flex-wrap gap-1.5">{platformIcons}</div>
  </div>
</Link>
```

## 4. Filter 機制

### 4.1 UI

只保留一條 filter row，緊接在搜尋框下方：

- pill 內容：`全部 / <Top 1> / <Top 2> / <Top 3>`，最多 4 個
- 互動：單選；回到「全部」需明確點「全部」pill（點已選中的 pill 不會 toggle，與既有篩選 pill 行為一致）
- 選中態：實心主色背景（沿用既有 FilterPills 樣式語彙）
- URL 反映：`?artist=<name>`；點「全部」則移除參數

### 4.2 Top 3 排序

依以下順序穩定排序：

1. `cover_count` 降冪（cover 數高的在前）
2. `original_artist` 升冪（中文以 unicode code point 比較）作為同票時的 tie-breaker

### 4.3 邊界

| 情況 | 行為 |
| --- | --- |
| DB 完全空（0 個 distinct artist） | 整條 filter row 隱藏 |
| 只有 1 個 artist | 顯示「全部」+ 該 artist，共 2 個 pill |
| 只有 2 個 artists | 顯示「全部」+ 2 個 artist pill |
| `?artist=<name>` 的 name 不存在 DB 中 | 列表顯示既有 empty state「還沒有符合條件的翻唱」，filter row 上沒有對應 pill 被標為選中 |

## 5. 卡片平台 icon

### 5.1 對應表

| platform | 圖示 | 來源 | 顯示文字（PLATFORM_LABEL） |
| --- | --- | --- | --- |
| `youtube` | `SiYoutube` | `react-icons/si` | YouTube |
| `instagram` | `SiInstagram` | `react-icons/si` | Instagram |
| `threads` | `SiThreads` | `react-icons/si` | Threads |
| `tiktok` | `SiTiktok` | `react-icons/si` | TikTok |
| `douyin` | `Music` | `lucide-react` | 抖音 |
| `xiaohongshu` | `SiXiaohongshu` | `react-icons/si` | 小紅書 |
| `other` | `Globe` | `lucide-react` | 其他 |

關於抖音的選擇：`react-icons/si` 沒收 Douyin（與 TikTok 同 ByteDance、logo 視覺幾乎一樣）。若兩者都用 `SiTiktok`，同一翻唱同時連抖音 + TikTok 時會出現重複 icon，無法區分。改用 lucide 的 `Music`（音符）讓兩者視覺上有差，aria-label 補上「抖音」確認意圖。

### 5.2 樣式

- 純 icon 排列，不包 pill 背景：`flex flex-wrap gap-1.5`
- 尺寸：`size-3.5`（14px）
- 顏色：YouTube 用 `text-primary` 強調，其他用 `text-foreground` / `text-muted-foreground`
- 每個 icon 包在 `<span aria-label="<platform name>">` 內，提供螢幕閱讀器標籤
- 同一首翻唱若同一平台出現多次（理論上不會但 DB 不強制 unique），全部顯示

## 6. 資料層改動

### 6.1 新增 view（migration `0003_cover_artist_counts.sql`）

```sql
create view public.cover_artist_counts as
select original_artist, count(*)::int as cover_count
from public.covers
group by original_artist;
```

權限：view 自動繼承 `covers` 表的 RLS policy（`covers_select_all` 允許任何人讀），所以匿名 client 可直接查 view。

### 6.1b 擴充平台 enum（migration `0004_extend_platforms.sql`）

```sql
alter table public.cover_links
  drop constraint cover_links_platform_check;

alter table public.cover_links
  add constraint cover_links_platform_check
  check (platform in (
    'youtube', 'instagram', 'threads',
    'tiktok', 'douyin', 'xiaohongshu',
    'other'
  ));
```

說明：Postgres check constraint 不能 ALTER，要 drop + 重 add。既有 row 不會被影響（已存在的值都在新清單裡）。

### 6.2 `lib/covers/types.ts`

`PLATFORMS` 與 `Platform` 擴充：

```ts
export const PLATFORMS = [
  'youtube',
  'instagram',
  'threads',
  'tiktok',
  'douyin',
  'xiaohongshu',
  'other',
] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  threads: 'Threads',
  tiktok: 'TikTok',
  douyin: '抖音',
  xiaohongshu: '小紅書',
  other: '其他',
}
```

`CoverQuery` 型別調整：

```ts
export type CoverQuery = {
  q?: string
  artist?: string      // 新增（取代 platform）
  tag?: string         // 保留
  sort: CoverSort
  limit: number
  offset: number
}
```

`platform: Platform` 從 `CoverQuery` 移除（Platform 型別本身保留，卡片仍要顯示平台 icon）。

`PLATFORMS` 陣列同時驅動：(1) `cover-card.tsx` 的 icon mapping、(2) `coverFormSchema` 的 `z.enum(PLATFORMS)`、(3) `PlatformLinkFields` 的 select 下拉選項——所以擴充 enum 後三處下拉/驗證會自動跟著加，不需手動同步。

### 6.3 `lib/covers/search-params.ts`

- `parseSearchParams`：移除 `platform`，新增 `artist`（值就是字串、不做白名單驗證）
- `buildQueryString`：對應調整

### 6.4 `lib/covers/queries.ts`

```ts
export async function listCovers(query: CoverQuery): Promise<CoverListResult> {
  const supabase = await createClient()

  let q = supabase
    .from('covers')
    .select('*, cover_links(*)', { count: 'exact' })
    .order('cover_date', { ascending: query.sort === 'oldest' })
    .range(query.offset, query.offset + query.limit - 1)

  if (query.q) {
    const escaped = query.q.replace(/[%_]/g, '\\$&')
    q = q.or(`title.ilike.%${escaped}%,original_artist.ilike.%${escaped}%`)
  }
  if (query.artist) q = q.eq('original_artist', query.artist)
  if (query.tag) q = q.contains('tags', [query.tag])

  const { data, error, count } = await q
  if (error) throw error
  const items = (data ?? []) as CoverWithLinks[]
  const total = count ?? 0
  return { items, total, hasMore: query.offset + items.length < total }
}

export async function getTopOriginalArtists(limit = 3): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cover_artist_counts')
    .select('original_artist')
    .order('cover_count', { ascending: false })
    .order('original_artist', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r) => r.original_artist)
}
```

「平台兩階段過濾」整段邏輯（原本 `if (query.platform) { ... }`）整段刪除。

## 7. 路由與 URL

`/covers` 路由不變。URL 查詢參數變動：

- 移除：`platform`
- 新增：`artist`（值是原唱名字，UTF-8 字串，需 URL-encode）
- 保留：`q`、`cursor`、`sort`（後者目前無 UI 觸發但資料層支援）

範例：

```
/covers?q=林&artist=林宥嘉&cursor=20
```

## 8. 元件

### 8.1 新增：`components/artist-filter-pills.tsx`

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

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

  const Pill = ({ label, value }: { label: string; value?: string }) => {
    const current = value === active || (!value && !active)
    return (
      <button
        type="button"
        onClick={() => set(value)}
        className={cn(
          'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
          current
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground shadow-sm hover:shadow',
        )}
        aria-pressed={current}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Pill label="全部" />
      {topArtists.map((name) => (
        <Pill key={name} label={name} value={name} />
      ))}
    </div>
  )
}
```

### 8.2 刪除：`components/filter-pills.tsx`

整支移除。沒有其他地方 import。

### 8.3 改寫：`components/cover-card.tsx`

依 §3.3 骨架重寫，加上 §5 的平台 icon 對應。

### 8.4 改寫：`app/covers/page.tsx`

- 容器寬度改為 `max-w-6xl`
- 移除 `<FilterPills>`，引入 `<ArtistFilterPills>`
- 列表外層改用 RWD class 切換 list ↔ grid
- 新增 `getTopOriginalArtists(3)` 呼叫，把結果傳給 `<ArtistFilterPills>`

```tsx
const params = await searchParams
const query = parseSearchParams(params)
const [{ items, total, hasMore }, topArtists] = await Promise.all([
  listCovers(query),
  getTopOriginalArtists(3),
])
```

## 9. 測試

### 9.1 E2E（`e2e/covers.spec.ts`）異動

- **移除**：「依平台篩選只顯示 Threads 的」測試
- **新增**：原唱 filter 測試
  - seed 三位原唱、不同 cover 數（例如 3+2+1）
  - 進 `/covers` 確認 filter row 顯示 3 個原唱 pill + 全部
  - 點 top 1 → 列表只顯示該原唱的翻唱
  - 點「全部」→ 列表恢復
- **新增**：DB 完全空時 filter row 隱藏的測試

### 9.2 單元（vitest）

- `tests/lib/search-params.test.ts`：將既有的 `platform` 解析測試替換為 `artist` 解析測試（合法字串保留、空字串視為 undefined）

## 10. 邊界與錯誤處理

| 情境 | 行為 |
| --- | --- |
| `getTopOriginalArtists` 失敗 | 拋錯，由 Next.js error boundary 處理（與既有 query 錯誤一致） |
| view 不存在（migration 未跑） | 同上，拋錯 |
| `?artist=` 帶非 DB 既有原唱名 | 列表空、empty state；filter row 無 pill 標選中態 |
| 縮圖 URL 失效 / 圖片載入失敗 | `bg-muted` 維持灰色佔位（既有行為） |

## 11. 已定案的關鍵選擇

- 拿掉平台 filter（每首翻唱都同步上傳多平台，filter 無鑑別力）
- 原唱 filter 採 Top 3 + 全部，不做「其他」
- 響應式：mobile 列表（左圖右文）、tablet 2 col grid、desktop 3 col grid（皆上圖下文）
- 縮圖比例 16:9
- 平台支援擴展：YouTube、Instagram、Threads、TikTok、抖音、小紅書、其他
- 平台 icon：六大平台 + Globe 兜底；抖音用 lucide `Music`（避免與 TikTok 撞 logo），其餘走 `react-icons/si`
- Top 3 排序穩定化：cover_count 降冪 → original_artist 升冪
- Top 3 查詢採 PostgreSQL view（不走 JS 端 aggregate、不引入 ORM）
- view 命名：`cover_artist_counts`
- 平台 enum 擴充採 drop + 重 add check constraint（Postgres 不支援 ALTER check）

## 12. 開放問題

目前無未決問題。

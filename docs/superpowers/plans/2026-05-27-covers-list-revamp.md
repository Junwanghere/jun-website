# /covers 列表頁改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把公開 `/covers` 列表頁從「1:1 縮圖／平台 filter／純文字平台標記」改造為「16:9 縮圖／原唱 filter／真實品牌色 icon ＋ 可點外連／RWD 1→2→3 col grid」。

**Architecture:** 既有 Next.js App Router + Supabase 架構不變。新增一支 PostgreSQL view（top 3 原唱查詢）、擴充平台 enum（加 TikTok ＋ 小紅書），refactor 資料層查詢函式、改寫 covers 列表頁與 CoverCard 元件、抽出 PlatformIcon 元件統一管理品牌色 icon 渲染。

**Tech Stack:** Next.js 15+、TypeScript、Tailwind CSS v4、Supabase（Postgres ＋ migrations）、`@supabase/ssr`、`react-icons/si`、`lucide-react`、Vitest、Playwright

**Spec:** `docs/superpowers/specs/2026-05-27-covers-list-revamp-design.md`

---

## File Structure

```
新增：
  supabase/migrations/0003_cover_artist_counts.sql       PostgreSQL view 給 top 3 查詢
  supabase/migrations/0004_extend_platforms.sql          擴充 platform enum 的 check constraint
  components/artist-filter-pills.tsx                     原唱 filter pills（取代 FilterPills）
  components/platform-icon.tsx                           統一 icon 渲染（品牌色、漸層、chromatic aberration）
  tests/components/platform-icon.test.tsx                PlatformIcon 元件測試

改寫：
  lib/covers/types.ts                                    PLATFORMS 擴充 + CoverQuery 改 artist
  lib/covers/search-params.ts                            drop platform、新增 artist
  lib/covers/queries.ts                                  drop platform 兩階段、新增 artist filter、新增 getTopOriginalArtists
  components/cover-card.tsx                              linked-card pattern + RWD + PlatformIcon
  app/covers/page.tsx                                    max-w-6xl + grid 切換 + ArtistFilterPills

刪除：
  components/filter-pills.tsx                            被 ArtistFilterPills 取代

測試更新：
  tests/lib/search-params.test.ts                        drop platform 解析、新增 artist 解析
  e2e/covers.spec.ts                                     drop platform 測試、新增 artist filter + icon click + empty 測試
```

---

### Task 1: 新增 migration 0003 — cover_artist_counts view

**Files:**

- Create: `supabase/migrations/0003_cover_artist_counts.sql`

- [ ] **Step 1: 產生空 migration 檔並改名**

```bash
cd /Users/junwang/Desktop/projects/jun-website
supabase migration new cover_artist_counts
mv supabase/migrations/*cover_artist_counts.sql supabase/migrations/0003_cover_artist_counts.sql
```

- [ ] **Step 2: 填入 SQL 內容**

`supabase/migrations/0003_cover_artist_counts.sql`：

```sql
-- 提供 top N 原唱查詢用的 view（PostgREST 不支援 GROUP BY，靠 view 包起來）
-- 自動繼承 covers 表的 RLS（covers_select_all 已允許 anon 讀）
create view public.cover_artist_counts as
select
  original_artist,
  count(*)::int as cover_count
from public.covers
group by original_artist;
```

- [ ] **Step 3: 套用到本機 DB**

```bash
supabase db reset
```

預期：所有 migration（0001、0002、0003）逐個 applying，無 SQL 錯誤。

注意：`supabase db reset` 會清掉 auth users，需要重建 admin 帳號（如果之後要登入 /admin）。本任務不需要登入。

- [ ] **Step 4: 驗證 view 可查**

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select * from public.cover_artist_counts"
```

預期：DB 空時回 0 rows，無 error。若 psql 不存在，可用 Supabase Studio 跑 SQL editor 同樣 query。

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_cover_artist_counts.sql
git commit -m "feat(db): cover_artist_counts view for top original artists query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 新增 migration 0004 — 擴充 platform enum

**Files:**

- Create: `supabase/migrations/0004_extend_platforms.sql`

- [ ] **Step 1: 產生 migration**

```bash
supabase migration new extend_platforms
mv supabase/migrations/*extend_platforms.sql supabase/migrations/0004_extend_platforms.sql
```

- [ ] **Step 2: 填入 SQL 內容**

`supabase/migrations/0004_extend_platforms.sql`：

```sql
-- Postgres check constraint 不能 ALTER，必須 drop + 重 add
-- 既有 row 不受影響（舊值都包含在新清單裡，新清單僅是擴充）
-- 0001_init_covers.sql 用 inline check 自動產生的約束名是 cover_links_platform_check

alter table public.cover_links
  drop constraint cover_links_platform_check;

alter table public.cover_links
  add constraint cover_links_platform_check
  check (platform in (
    'youtube',
    'instagram',
    'threads',
    'tiktok',
    'xiaohongshu',
    'other'
  ));
```

- [ ] **Step 3: 套用**

```bash
supabase db reset
```

- [ ] **Step 4: 驗證新值可用**

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
  insert into public.covers (title, original_artist, cover_date) values ('test', 'test', '2026-01-01') returning id" \
  | head -3
```

抓出來的 id 直接拿去測 cover_links 插入 tiktok 不報錯：

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
  insert into public.cover_links (cover_id, platform, url) values
  ((select id from public.covers limit 1), 'tiktok', 'https://tiktok.com/@x/video/1')"
```

預期：兩條 insert 都成功，無 check violation。

驗證完手動清掉測試資料：

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "delete from public.covers where title = 'test'"
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_extend_platforms.sql
git commit -m "feat(db): extend platform enum with tiktok and xiaohongshu

Drop and re-add check constraint (Postgres doesn't support ALTER on
check). Existing rows unaffected — new values are supersets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 更新 `lib/covers/types.ts`

**Files:**

- Modify: `lib/covers/types.ts`

- [ ] **Step 1: 整支覆寫**

`lib/covers/types.ts`：

```ts
export const PLATFORMS = [
  'youtube',
  'instagram',
  'threads',
  'tiktok',
  'xiaohongshu',
  'other',
] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  threads: 'Threads',
  tiktok: 'TikTok',
  xiaohongshu: '小紅書',
  other: '其他',
}

export type CoverLink = {
  id: string
  cover_id: string
  platform: Platform
  platform_label: string | null
  url: string
}

export type Cover = {
  id: string
  title: string
  original_artist: string
  cover_date: string // ISO date
  thumbnail_url: string | null
  description: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export type CoverWithLinks = Cover & { cover_links: CoverLink[] }

export type CoverSort = 'newest' | 'oldest'

export type CoverQuery = {
  q?: string
  artist?: string // 取代 platform
  tag?: string
  sort: CoverSort
  limit: number
  offset: number
}
```

差異：`PLATFORMS` 加 `tiktok`、`xiaohongshu`；`PLATFORM_LABEL` 加對應顯示文字；`CoverQuery` 移除 `platform?: Platform`、新增 `artist?: string`。

- [ ] **Step 2: 跑類型檢查**

```bash
pnpm build
```

預期：build 會在「使用了 `CoverQuery.platform`」的地方報錯（lib/covers/search-params.ts、lib/covers/queries.ts、app/covers/page.tsx、components/filter-pills.tsx）。這些檔案在後續 task 處理；現在 build 失敗是預期的。

如果想暫時讓 build 過，可以跳到 Task 4 開始之前都不跑 build。後續 task 會修完。

- [ ] **Step 3: Commit**

```bash
git add lib/covers/types.ts
git commit -m "feat(covers): extend PLATFORMS and switch CoverQuery to artist filter

Adds tiktok and xiaohongshu to PLATFORMS. Drops CoverQuery.platform
in favour of CoverQuery.artist. Downstream files updated in following
tasks — build will fail until Task 5 lands.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 更新 `search-params.ts`（TDD）

**Files:**

- Modify: `tests/lib/search-params.test.ts`
- Modify: `lib/covers/search-params.ts`

- [ ] **Step 1: 改寫測試**

`tests/lib/search-params.test.ts`（整支覆寫）：

```ts
import { describe, it, expect } from 'vitest'
import { parseSearchParams } from '@/lib/covers/search-params'

describe('parseSearchParams', () => {
  it('沒有參數時用預設值', () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      artist: undefined,
      tag: undefined,
      sort: 'newest',
      limit: 20,
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

  it('cursor 轉成 offset', () => {
    expect(parseSearchParams({ cursor: '40' }).offset).toBe(40)
  })

  it('忽略不合法 cursor', () => {
    expect(parseSearchParams({ cursor: 'abc' }).offset).toBe(0)
    expect(parseSearchParams({ cursor: '-5' }).offset).toBe(0)
  })
})
```

- [ ] **Step 2: 跑測試確認 FAIL**

```bash
pnpm test tests/lib/search-params.test.ts
```

預期：FAIL（舊 search-params.ts 還在處理 `platform`，回傳結構不對）。

- [ ] **Step 3: 整支覆寫 `lib/covers/search-params.ts`**

```ts
import { type CoverQuery, type CoverSort } from './types'

const DEFAULT_LIMIT = 20

function asSort(v: unknown): CoverSort {
  return v === 'oldest' ? 'oldest' : 'newest'
}

function asOffset(v: unknown): number {
  if (typeof v !== 'string') return 0
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0) return 0
  return n
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
    offset: asOffset(get('cursor')),
  }
}

export function buildQueryString(q: Partial<CoverQuery>): string {
  const sp = new URLSearchParams()
  if (q.q) sp.set('q', q.q)
  if (q.artist) sp.set('artist', q.artist)
  if (q.tag) sp.set('tag', q.tag)
  if (q.sort && q.sort !== 'newest') sp.set('sort', q.sort)
  if (q.offset) sp.set('cursor', String(q.offset))
  return sp.toString()
}
```

差異：移除 `asPlatform` 與 `PLATFORMS` 依賴；`platform` → `artist`（純字串、無白名單）；空字串歸入 `undefined`。

- [ ] **Step 4: 跑測試確認 PASS**

```bash
pnpm test tests/lib/search-params.test.ts
```

預期：6 passed。

- [ ] **Step 5: Commit**

```bash
git add tests/lib/search-params.test.ts lib/covers/search-params.ts
git commit -m "feat(covers): swap platform parsing for artist in search-params

Drop platform whitelist validation; artist accepts arbitrary strings
(value is just a search key — the filter UI controls what users can
pick). Tests updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 更新 `lib/covers/queries.ts`

**Files:**

- Modify: `lib/covers/queries.ts`

- [ ] **Step 1: 整支覆寫**

```ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CoverQuery, CoverWithLinks } from './types'

export type CoverListResult = {
  items: CoverWithLinks[]
  total: number
  hasMore: boolean
}

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

export async function getCoverById(id: string): Promise<CoverWithLinks | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('covers')
    .select('*, cover_links(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as CoverWithLinks | null
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

差異：

- 拿掉 `coverIdsFilter`（平台兩階段過濾）整段邏輯
- `listCovers` 加 `if (query.artist) q = q.eq('original_artist', query.artist)`
- 新增 `getTopOriginalArtists(limit)`

- [ ] **Step 2: 跑 build 確認 TypeScript 過**

```bash
pnpm build
```

預期：仍會 fail，因為 `app/covers/page.tsx` 還在 import `FilterPills` 並用舊的 `query.platform`。Task 10 會修。

但 build 中的 lib/ 應該都 compile 過了——錯誤訊息只在 app/ 與 components/。確認錯誤訊息只剩這些。

- [ ] **Step 3: Commit**

```bash
git add lib/covers/queries.ts
git commit -m "feat(covers): drop platform filter, add artist filter and top-3 query

listCovers: remove two-stage platform filter logic, swap in
.eq('original_artist', query.artist). Add getTopOriginalArtists
(uses the cover_artist_counts view from migration 0003).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 新增 PlatformIcon 元件（TDD）

**Files:**

- Create: `tests/components/platform-icon.test.tsx`
- Create: `components/platform-icon.tsx`

- [ ] **Step 1: 寫失敗的測試**

`tests/components/platform-icon.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PlatformIcon } from '@/components/platform-icon'

describe('PlatformIcon', () => {
  it.each([
    ['youtube', 'YouTube'],
    ['instagram', 'Instagram'],
    ['threads', 'Threads'],
    ['tiktok', 'TikTok'],
    ['xiaohongshu', '小紅書'],
    ['other', '其他'],
  ] as const)('platform=%s 渲染 aria-label %s', (platform, label) => {
    render(<PlatformIcon platform={platform} />)
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('platform=other 時 label prop 覆寫 aria-label', () => {
    render(<PlatformIcon platform="other" label="StreetVoice" />)
    expect(screen.getByLabelText('StreetVoice')).toBeInTheDocument()
    expect(screen.queryByLabelText('其他')).not.toBeInTheDocument()
  })

  it('Instagram 渲染 SVG 包含漸層 fill 引用', () => {
    const { container } = render(<PlatformIcon platform="instagram" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.innerHTML).toContain('url(#') // linearGradient fill reference
  })

  it('TikTok 渲染三層 SVG 達成 chromatic aberration', () => {
    const { container } = render(<PlatformIcon platform="tiktok" />)
    // wrapper 內含 3 個 svg 元素（青、紅、黑）
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: 跑確認 FAIL**

```bash
pnpm test tests/components/platform-icon.test.tsx
```

預期：FAIL（找不到模組）。

- [ ] **Step 3: 實作 `components/platform-icon.tsx`**

```tsx
import { useId } from 'react'
import { SiYoutube, SiThreads, SiXiaohongshu, SiTiktok } from 'react-icons/si'
import { Globe } from 'lucide-react'
import { PLATFORM_LABEL, type Platform } from '@/lib/covers/types'

type Props = {
  platform: Platform
  label?: string | null
  size?: number
}

const BRAND = {
  youtube: '#FF0000',
  threads: '#000000',
  xiaohongshu: '#FF2442',
  tiktokBlack: '#000000',
  tiktokCyan: '#25F4EE',
  tiktokRed: '#FE2C55',
  other: '#737F84',
} as const

// Instagram SVG path（與 react-icons/si 的 SiInstagram 同源，獨立出來才能套漸層 fill）
const INSTAGRAM_PATH =
  'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z'

function ariaLabel(platform: Platform, label?: string | null): string {
  if (platform === 'other' && label) return label
  return PLATFORM_LABEL[platform]
}

export function PlatformIcon({ platform, label, size = 14 }: Props) {
  const aria = ariaLabel(platform, label)
  const sizePx = `${size}px`
  // useId 在 RSC 與 Client Component 都可用且 SSR/CSR 一致；避免 Math.random 在
  // 將來 PlatformIcon 被巢狀進 Client Component 時出現 hydration mismatch
  const rawId = useId()
  const gradId = `ig-grad${rawId.replace(/:/g, '')}`

  if (platform === 'instagram') {
    return (
      <span role="img" aria-label={aria} style={{ display: 'inline-flex' }}>
        <svg width={size} height={size} viewBox="0 0 24 24">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FCAF45" />
              <stop offset="25%" stopColor="#F77737" />
              <stop offset="50%" stopColor="#E1306C" />
              <stop offset="75%" stopColor="#C13584" />
              <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
          </defs>
          <path d={INSTAGRAM_PATH} fill={`url(#${gradId})`} />
        </svg>
      </span>
    )
  }

  if (platform === 'tiktok') {
    return (
      <span
        role="img"
        aria-label={aria}
        style={{ position: 'relative', display: 'inline-block', width: sizePx, height: sizePx }}
      >
        <SiTiktok
          size={size}
          color={BRAND.tiktokCyan}
          style={{
            position: 'absolute',
            left: '-1px',
            top: 0,
            mixBlendMode: 'screen',
          }}
        />
        <SiTiktok
          size={size}
          color={BRAND.tiktokRed}
          style={{
            position: 'absolute',
            left: '1px',
            top: 0,
            mixBlendMode: 'screen',
          }}
        />
        <SiTiktok
          size={size}
          color={BRAND.tiktokBlack}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
      </span>
    )
  }

  if (platform === 'youtube') {
    return (
      <span role="img" aria-label={aria} style={{ display: 'inline-flex' }}>
        <SiYoutube size={size} color={BRAND.youtube} />
      </span>
    )
  }

  if (platform === 'threads') {
    return (
      <span role="img" aria-label={aria} style={{ display: 'inline-flex' }}>
        <SiThreads size={size} color={BRAND.threads} />
      </span>
    )
  }

  if (platform === 'xiaohongshu') {
    return (
      <span role="img" aria-label={aria} style={{ display: 'inline-flex' }}>
        <SiXiaohongshu size={size} color={BRAND.xiaohongshu} />
      </span>
    )
  }

  // platform === 'other'
  return (
    <span role="img" aria-label={aria} style={{ display: 'inline-flex' }}>
      <Globe size={size} color={BRAND.other} />
    </span>
  )
}
```

- [ ] **Step 4: 跑測試確認 PASS**

```bash
pnpm test tests/components/platform-icon.test.tsx
```

預期：8 passed（6 個 each + 1 label 覆寫 + 1 Instagram gradient + 1 TikTok 三層）。

- [ ] **Step 5: 跑 format ＋ lint**

```bash
pnpm format
pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add tests/components/platform-icon.test.tsx components/platform-icon.tsx
git commit -m "feat(covers): PlatformIcon component with brand colors (gradient + chromatic)

Encapsulates icon rendering for all 6 platforms. Instagram uses inline
SVG with linearGradient (#833AB4 → #FCAF45). TikTok uses three stacked
react-icons SiTiktok layers with mix-blend-mode: screen for chromatic
aberration. Others use react-icons or lucide-react with brand color.
aria-label sources from PLATFORM_LABEL; overridable via label prop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 新增 ArtistFilterPills 元件

**Files:**

- Create: `components/artist-filter-pills.tsx`

- [ ] **Step 1: 實作**

`components/artist-filter-pills.tsx`：

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

- [ ] **Step 2: 跑 format ＋ lint**

```bash
pnpm format
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/artist-filter-pills.tsx
git commit -m "feat(covers): ArtistFilterPills component (single-select, top N + 全部)

Receives pre-computed top artists from server component; clicking a
pill writes ?artist=<name> to URL and resets cursor. Returns null when
no artists (DB empty), allowing the page to omit the filter row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 改寫 CoverCard 元件

**Files:**

- Modify: `components/cover-card.tsx`

- [ ] **Step 1: 整支覆寫**

`components/cover-card.tsx`：

```tsx
import Link from 'next/link'
import { PlatformIcon } from '@/components/platform-icon'
import { PLATFORM_LABEL, type CoverWithLinks } from '@/lib/covers/types'

export function CoverCard({ cover }: { cover: CoverWithLinks }) {
  return (
    <article className="bg-card relative flex gap-3 rounded-2xl p-3 shadow-sm transition hover:shadow-md md:flex-col md:gap-2">
      <div
        className="bg-muted aspect-video w-32 shrink-0 rounded-xl md:w-full"
        style={
          cover.thumbnail_url
            ? { background: `center/cover no-repeat url('${cover.thumbnail_url}')` }
            : undefined
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-card-foreground truncate text-base font-bold">
          <Link
            href={`/covers/${cover.id}`}
            className="focus-visible:ring-ring rounded after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:outline-none"
          >
            {cover.title}
          </Link>
        </h3>
        <div className="text-muted-foreground truncate text-xs">
          原唱 {cover.original_artist} · {cover.cover_date}
        </div>
        <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1.5">
          {cover.cover_links.map((l) => {
            const ariaName =
              l.platform === 'other' && l.platform_label
                ? l.platform_label
                : PLATFORM_LABEL[l.platform]
            return (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`在 ${ariaName} 觀看`}
                className="focus-visible:ring-ring inline-flex items-center rounded transition hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
              >
                <PlatformIcon platform={l.platform} label={l.platform_label} />
              </a>
            )
          })}
        </div>
      </div>
    </article>
  )
}
```

差異：

- 容器從 `<Link>` 改為 `<article className="relative ...">`
- 標題包成 `<h3><Link className="... after:absolute after:inset-0 ...">{title}</Link></h3>`，`::after` 偽元素把整張卡點擊區域覆蓋
- icon 區塊 `relative z-10` 浮在 overlay 上方
- 每個 icon 改成 `<a target="_blank" rel="noreferrer noopener" aria-label="在 X 觀看">` 包 `<PlatformIcon>`
- RWD：`md:flex-col md:gap-2`（桌機改上下版型）、縮圖 `aspect-video w-32 md:w-full`（手機 128×72、md+ 全寬保持 16:9）
- 拿掉舊版本的 `PLATFORM_SHORT` 與 `platformPillClass`

- [ ] **Step 2: 跑 format ＋ lint**

```bash
pnpm format
pnpm lint
```

- [ ] **Step 3: 跑 vitest 確認既有測試沒掛**

```bash
pnpm test
```

預期：既有測試（portal-card、smoke、platform-icon、search-params、cover-schema、youtube）全綠。CoverCard 沒有單元測試（既有沒寫；本任務也不新增——後續 e2e 會覆蓋行為）。

- [ ] **Step 4: Commit**

```bash
git add components/cover-card.tsx
git commit -m "feat(covers): rework CoverCard with linked-card pattern, RWD, brand icons

Container becomes <article>, title gets <Link> with ::after overlay
covering the whole card (so blank-area click still goes to detail).
Platform icons become <a target=\"_blank\"> wrappers with z-10 so they
float above the overlay. Thumbnail 1:1 → 16:9 (w-32 mobile, w-full
md+). Mobile keeps row layout; md+ stacks (image top, text below) for
2/3-col grid use.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: 刪除 `components/filter-pills.tsx`

**Files:**

- Delete: `components/filter-pills.tsx`

- [ ] **Step 1: 確認沒有其他地方在用**

```bash
grep -rn "filter-pills\|FilterPills" --include="*.tsx" --include="*.ts" app/ components/ lib/ tests/ e2e/
```

預期：除了 `components/filter-pills.tsx` 本身外，應該還有 `app/covers/page.tsx` 在 import。Task 10 會處理 page.tsx，所以這裡先刪除元件、page.tsx 短暫 broken 也沒關係（build 在 Task 10 完才會恢復）。

- [ ] **Step 2: 刪除**

```bash
rm components/filter-pills.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(covers): remove FilterPills (replaced by ArtistFilterPills)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 改寫 `app/covers/page.tsx`

**Files:**

- Modify: `app/covers/page.tsx`

- [ ] **Step 1: 整支覆寫**

`app/covers/page.tsx`：

```tsx
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CoverCard } from '@/components/cover-card'
import { SearchInput } from '@/components/search-input'
import { ArtistFilterPills } from '@/components/artist-filter-pills'
import { LoadMoreButton } from '@/components/load-more-button'
import { listCovers, getTopOriginalArtists } from '@/lib/covers/queries'
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
  const [{ items, total, hasMore }, topArtists] = await Promise.all([
    listCovers(query),
    getTopOriginalArtists(3),
  ])

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回首頁
        </Link>

        <div className="mt-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">翻唱</h1>
          <span className="text-primary text-sm font-bold">{total} 首</span>
        </div>

        <div className="mt-3 md:max-w-md">
          <SearchInput defaultValue={query.q} />
        </div>
        <div className="mt-3">
          <ArtistFilterPills topArtists={topArtists} active={query.artist} />
        </div>

        <ul className="mt-4 flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
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
      </div>
    </main>
  )
}
```

差異：

- 容器 `max-w-[480px]` → `max-w-6xl`
- 搜尋框 wrapper 加 `md:max-w-md`
- 拿掉 `<FilterPills>`，換 `<ArtistFilterPills topArtists={topArtists} active={query.artist} />`
- 平行跑 `listCovers` + `getTopOriginalArtists`（`Promise.all`）
- 列表 ul：手機 `flex flex-col gap-3`、md+ `md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3`
- empty state 在 grid 模式下要 `col-span` 整排（`md:col-span-2 lg:col-span-3`）

- [ ] **Step 2: 跑完整 build**

```bash
pnpm lint
pnpm test
pnpm format
pnpm format:check
pnpm build
```

預期：全綠。build 顯示 `/covers` 為 dynamic route。

- [ ] **Step 3: Commit**

```bash
git add app/covers/page.tsx
git commit -m "feat(covers): RWD grid layout + artist filter on /covers page

Container widens to max-w-6xl on desktop. List uses 1-col flex on
mobile, 2-col grid at md, 3-col grid at lg. SearchInput limited to
md:max-w-md so it doesn't sprawl. Fetches topArtists in parallel with
listCovers; passes both to ArtistFilterPills. Empty state spans all
columns in grid mode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: 更新 E2E 測試

**Files:**

- Modify: `e2e/covers.spec.ts`

- [ ] **Step 1: 整支覆寫**

`e2e/covers.spec.ts`：

```ts
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
  await page.getByRole('link', { name: '交換餘生' }).click()
  await expect(page.locator('h1', { hasText: '交換餘生' })).toBeVisible()
  await expect(page.locator('iframe')).toBeVisible()
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
```

差異：

- 拿掉「依平台篩選只顯示 Threads 的」
- 新增「原唱 filter 點 top 1 過濾」
- 新增「DB 空時 filter row 隱藏」
- 既有「點卡片進詳情頁」改成 `getByRole('link', { name: title })`（精準對到標題 link）
- 新增「點 icon 在新分頁開啟」，用 attribute 驗證 + Cmd+click 確認不會跳走

- [ ] **Step 2: 跑 E2E**

```bash
pnpm test:e2e
```

預期：全綠（admin spec 不動、smoke spec 不動、covers spec 6 個 test 都 pass）。

如果「DB 空時 filter row 隱藏」這個 test fail，檢查：

- ArtistFilterPills 是否真的在 topArtists 為空時 return null
- `getByRole('button', { name: '全部' })` 用 `not.toBeAttached()` 確認完全不在 DOM 裡

如果「點卡片標題進詳情頁」fail，檢查 cover-card.tsx 的 h3 內是否有正確 `<Link>`，且 link 的 accessible name 為歌名。

- [ ] **Step 3: Commit**

```bash
git add e2e/covers.spec.ts
git commit -m "test(e2e): replace platform filter test with artist filter + icon click tests

Drops the now-invalid 'filter by Threads' test. Adds:
- artist filter pill narrows list and 全部 restores
- empty DB hides the filter row and shows empty state
- title link goes to detail
- icon link is target=_blank with platform URL and doesn't navigate
  current page (Cmd-click to dodge actually opening external)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: 最終驗證

**Files:** 無（驗證 + tag）

- [ ] **Step 1: 跑所有檢查**

```bash
cd /Users/junwang/Desktop/projects/jun-website
pnpm lint
pnpm test
pnpm format:check
pnpm build
pnpm test:e2e
```

預期：全綠。

- [ ] **Step 2: 手動體驗清單（可選但推薦）**

啟動 dev server：

```bash
pnpm dev
```

到 http://localhost:3000/covers（先在 Studio 或 admin 後台塞幾首翻唱、含 16:9 縮圖、含多平台連結），確認：

- 手機（resize 視窗 < 768px）顯示 1 col 列表、左圖右文、縮圖 16:9
- 平板（768–1024px）顯示 2 col grid、上圖下文
- 桌機（≥1024px）顯示 3 col grid、上圖下文
- 原唱 filter pill 顯示 top 3 + 全部，點擊有過濾效果
- 卡片 icon 顯示真實品牌色（YT 紅、IG 漸層、TikTok 偏移、小紅書紅）
- icon 點擊在新分頁打開平台 URL
- 卡片其他區域點擊到詳情頁
- 鍵盤 Tab 順序合理：先標題、再各 icon

- [ ] **Step 3: Tag**

```bash
git tag covers-revamp
git log --oneline phase-1-covers..HEAD
```

預期：tag 建立成功；log 顯示這次 revamp 的所有 commits。

---

## 後續未涵蓋（之後階段獨立 spec）

- 後台 `/admin/covers` 列表也用相同 RWD/icon 處理
- 詳情頁 `/covers/[id]` 用同支 `PlatformIcon` 渲染平台 link
- Tag filter UI（資料層已支援 `query.tag`，UI 未建）
- 排序方向切換 UI（資料層已支援 `query.sort`）

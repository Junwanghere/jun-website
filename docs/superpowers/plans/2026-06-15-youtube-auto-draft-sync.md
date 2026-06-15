# YouTube 排程自動建草稿 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vercel Cron 每晚（台灣 00:00）讀 YouTube RSS，把新片自動建成草稿，使用者只需在 admin 補四個平台連結並發布。

**Architecture:** 純函式（標題解析、RSS 解析、去重）獨立可單測；DB 同步服務用 service-role client 繞 RLS 寫入；cron route 與 admin「立即同步」共用同一個 `syncYouTubeDrafts()`。草稿用 `covers.status` 欄位區隔，查詢層預設只回 `published`，admin 傳旗標才看得到草稿。

**Tech Stack:** Next 16 App Router（route handler）、Supabase（Postgres + PostgREST）、`@supabase/supabase-js`（service-role client）、Vitest、Vercel Cron。

> **Next 16 注意**：route handler 與 cron 設定請先翻 `node_modules/next/dist/docs/`（AGENTS.md 規定），確認 `GET` handler 簽名與 `vercel.json` crons 寫法沒有破壞性變更再下手。

---

## 檔案結構

### 新增
- `supabase/migrations/0005_cover_status.sql` — status 欄 + 重建 view
- `lib/youtube/rss.ts` — `parseCoverTitle`、`parseChannelFeed`、`fetchChannelFeed`、`selectNewEntries`
- `lib/supabase/admin.ts` — service-role client
- `lib/covers/sync-youtube.ts` — `syncYouTubeDrafts()` 同步服務
- `app/api/cron/youtube-sync/route.ts` — cron GET handler
- `tests/lib/parse-cover-title.test.ts`
- `tests/lib/parse-channel-feed.test.ts`
- `tests/lib/select-new-entries.test.ts`

### 修改
- `lib/covers/types.ts` — `Cover` 加 `status` 欄
- `lib/covers/queries.ts` — `listCovers` / `getCoverById` 加 `opts.includeDrafts`
- `app/admin/covers/page.tsx` — 待補草稿置頂區塊 + 立即同步按鈕
- `app/admin/covers/[id]/edit/page.tsx` — 讀草稿 + 傳 status
- `app/admin/covers/actions.ts` — `saveCover` 加 status；新增 `syncDraftsNow` action
- `components/admin/cover-form.tsx` — 草稿時兩顆按鈕（發布／先存草稿）
- `vercel.json` — crons
- `.env.local.example` — 新增三個環境變數說明

---

## Task 1: Migration — covers.status 欄位與 view（含型別）

**Files:**
- Create: `supabase/migrations/0005_cover_status.sql`
- Modify: `lib/covers/types.ts`

- [ ] **Step 1: 寫 migration**

```sql
-- 草稿/已發布狀態。預設 published：既有 row 加欄時自動套用，不受影響。
alter table public.covers
  add column status text not null default 'published'
  check (status in ('draft', 'published'));

create index covers_status_idx on public.covers (status);

-- 熱門原唱統計只算已發布（草稿不灌統計）。
-- view 在 Supabase 預設 security definer（繞 RLS），故必須在這裡顯式過濾。
create or replace view public.cover_artist_counts as
select
  original_artist,
  count(*)::int as cover_count
from public.covers
where status = 'published'
group by original_artist;
```

- [ ] **Step 2: 套用到本機 DB 並驗證**

Run: `pnpm db:reset`（或你慣用的本機 migration 套用方式）
Expected: 無錯誤；`covers` 出現 `status` 欄、既有資料皆為 `published`。

驗證查詢（任一 SQL client 或 supabase studio）：
```sql
select status, count(*) from public.covers group by status;
```
Expected: 全部落在 `published`。

- [ ] **Step 3: `Cover` 型別加 status**

`lib/covers/types.ts` 的 `Cover` 加一欄（緊接 `cover_date` 之後）：
```ts
export type Cover = {
  id: string
  title: string
  original_artist: string
  cover_date: string // ISO date
  status: 'draft' | 'published'
  thumbnail_url: string | null
  description: string | null
  tags: string[]
  created_at: string
  updated_at: string
}
```

- [ ] **Step 4: 型別檢查**

Run: `pnpm exec tsc --noEmit`
Expected: 無錯誤。

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_cover_status.sql lib/covers/types.ts
git commit -m "feat(covers): add status column (draft/published) + filter artist view"
```

---

## Task 2: 查詢層 — 公開只看 published，admin 可含草稿

**Files:**
- Modify: `lib/covers/queries.ts`

> 這層沒有單元測試（需真 DB），用整合驗證。公開頁與 admin 共用同一組函式，靠 `opts.includeDrafts` 分流。

- [ ] **Step 1: 改 `listCovers` 與 `getCoverById` 簽名與過濾**

`lib/covers/queries.ts` — 替換 `listCovers` 與 `getCoverById`：

```ts
export async function listCovers(
  query: CoverQuery,
  opts: { includeDrafts?: boolean } = {},
): Promise<CoverListResult> {
  const supabase = await createClient()

  let q = supabase
    .from('covers')
    .select('*, cover_links(*)', { count: 'exact' })
    .order('cover_date', { ascending: query.sort === 'oldest' })
    .range(query.offset, query.offset + query.limit - 1)

  if (!opts.includeDrafts) q = q.eq('status', 'published')

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

export async function getCoverById(
  id: string,
  opts: { includeDrafts?: boolean } = {},
): Promise<CoverWithLinks | null> {
  const supabase = await createClient()
  let q = supabase.from('covers').select('*, cover_links(*)').eq('id', id)
  if (!opts.includeDrafts) q = q.eq('status', 'published')
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data as CoverWithLinks | null
}
```

> `loadMoreCovers`（`lib/covers/actions.ts`）與公開 `/covers`、`/covers/[id]` 不傳 opts → 自動只看 published，無需改動。

- [ ] **Step 2: 型別檢查**

Run: `pnpm exec tsc --noEmit`
Expected: 無錯誤（既有公開呼叫端因 opts 有預設值，不需改參數）。

- [ ] **Step 3: 既有測試回歸**

Run: `pnpm test`
Expected: 全綠。

- [ ] **Step 4: Commit**

```bash
git add lib/covers/queries.ts
git commit -m "feat(covers): hide drafts from public queries via includeDrafts opt"
```

---

## Task 3: `parseCoverTitle` — 標題解析（TDD）

**Files:**
- Create: `lib/youtube/rss.ts`
- Test: `tests/lib/parse-cover-title.test.ts`

- [ ] **Step 1: 寫失敗測試**

`tests/lib/parse-cover-title.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { parseCoverTitle } from '@/lib/youtube/rss'

describe('parseCoverTitle', () => {
  it('標準格式：〈歌名〉- 歌手 （Cover by Jun)', () => {
    expect(parseCoverTitle('〈不想和你分開〉- 椅子樂團 （Cover by Jun)')).toEqual({
      song: '不想和你分開',
      artist: '椅子樂團',
    })
  })

  it('半形括號的 (Cover by Jun) 也認得', () => {
    expect(parseCoverTitle('〈梅雨季〉- 張震嶽 (Cover by Jun)')).toEqual({
      song: '梅雨季',
      artist: '張震嶽',
    })
  })

  it('英文歌名與英文歌手', () => {
    expect(parseCoverTitle('〈seasons〉- wave to earth (Cover by Jun)')).toEqual({
      song: 'seasons',
      artist: 'wave to earth',
    })
  })

  it('沒有書名號 → 解析失敗回 null', () => {
    expect(parseCoverTitle('梅雨季 cover')).toEqual({ song: null, artist: null })
  })

  it('有書名號但缺破折號分隔 → 解析失敗回 null', () => {
    expect(parseCoverTitle('〈隨便唱唱〉一些雜記')).toEqual({ song: null, artist: null })
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test parse-cover-title`
Expected: FAIL（`parseCoverTitle` 不存在）。

- [ ] **Step 3: 實作 `parseCoverTitle`**

新增 `lib/youtube/rss.ts`（先放這個函式）：

```ts
// 解析 YouTube 標題。只認全形書名號 〈〉 的格式：
// 〈歌名〉- 歌手 (Cover by Jun)   破折號可為 - 或 －，Cover 括號可全/半形。
// 命不中就回 { null, null }，呼叫端自行 fallback。
export function parseCoverTitle(rawTitle: string): {
  song: string | null
  artist: string | null
} {
  const m = rawTitle.match(/〈(.+?)〉\s*[-－]\s*(.+)/)
  if (!m) return { song: null, artist: null }
  const song = m[1].trim()
  // 去掉結尾的 (Cover by Jun) / （Cover by Jun) 等
  const artist = m[2].replace(/\s*[（(]\s*cover\b.*$/i, '').trim()
  if (!song || !artist) return { song: null, artist: null }
  return { song, artist }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test parse-cover-title`
Expected: PASS（5 個案例全綠）。

- [ ] **Step 5: Commit**

```bash
git add lib/youtube/rss.ts tests/lib/parse-cover-title.test.ts
git commit -m "feat(youtube): parseCoverTitle for 〈song〉- artist titles"
```

---

## Task 4: `parseChannelFeed` / `fetchChannelFeed` — RSS 解析（TDD）

**Files:**
- Modify: `lib/youtube/rss.ts`
- Test: `tests/lib/parse-channel-feed.test.ts`

- [ ] **Step 1: 寫失敗測試**

`tests/lib/parse-channel-feed.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { parseChannelFeed } from '@/lib/youtube/rss'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>頻道標題（不該被當成影片）</title>
  <entry>
    <yt:videoId>mDnelt8J_rc</yt:videoId>
    <title>〈不想和你分開〉- 椅子樂團 （Cover by Jun)</title>
    <published>2026-06-13T10:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>zuKanT80y7M</yt:videoId>
    <title>〈梅雨季〉- 張震嶽 (Cover by Jun)</title>
    <published>2026-06-08T09:30:00+00:00</published>
  </entry>
</feed>`

describe('parseChannelFeed', () => {
  it('取出每個 entry 的 videoId / title / published', () => {
    expect(parseChannelFeed(SAMPLE)).toEqual([
      {
        videoId: 'mDnelt8J_rc',
        title: '〈不想和你分開〉- 椅子樂團 （Cover by Jun)',
        published: '2026-06-13T10:00:00+00:00',
      },
      {
        videoId: 'zuKanT80y7M',
        title: '〈梅雨季〉- 張震嶽 (Cover by Jun)',
        published: '2026-06-08T09:30:00+00:00',
      },
    ])
  })

  it('沒有 entry 時回空陣列', () => {
    expect(parseChannelFeed('<feed><title>空頻道</title></feed>')).toEqual([])
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test parse-channel-feed`
Expected: FAIL（`parseChannelFeed` 不存在）。

- [ ] **Step 3: 實作 `parseChannelFeed` 與 `fetchChannelFeed`**

在 `lib/youtube/rss.ts` 追加：

```ts
export type FeedEntry = {
  videoId: string
  title: string
  published: string
}

// 輕量解析（不加 XML 套件）：先切出每個 <entry>…</entry>，再各自抓欄位。
// 注意只取 entry 內的 <title>，避免抓到 feed 頂層的頻道標題。
export function parseChannelFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  const blocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/g) ?? []
  for (const block of blocks) {
    const videoId = block.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const published = block.match(/<published>(.*?)<\/published>/)?.[1]
    if (videoId && title && published) {
      entries.push({ videoId, title: decodeXml(title.trim()), published })
    }
  }
  return entries
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export async function fetchChannelFeed(channelId: string): Promise<FeedEntry[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`YouTube RSS ${res.status}`)
  return parseChannelFeed(await res.text())
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test parse-channel-feed`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/youtube/rss.ts tests/lib/parse-channel-feed.test.ts
git commit -m "feat(youtube): parse + fetch channel RSS feed"
```

---

## Task 5: `selectNewEntries` 去重 + admin client + 同步服務

**Files:**
- Modify: `lib/youtube/rss.ts`（加 `selectNewEntries`）
- Create: `lib/supabase/admin.ts`
- Create: `lib/covers/sync-youtube.ts`
- Test: `tests/lib/select-new-entries.test.ts`

- [ ] **Step 1: 寫 `selectNewEntries` 失敗測試**

`tests/lib/select-new-entries.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { selectNewEntries, type FeedEntry } from '@/lib/youtube/rss'

const entries: FeedEntry[] = [
  { videoId: 'aaa', title: 'A', published: '2026-06-13T00:00:00+00:00' },
  { videoId: 'bbb', title: 'B', published: '2026-06-12T00:00:00+00:00' },
  { videoId: 'ccc', title: 'C', published: '2026-06-11T00:00:00+00:00' },
]

describe('selectNewEntries', () => {
  it('過濾掉已收錄的 videoId', () => {
    expect(selectNewEntries(entries, new Set(['bbb']))).toEqual([
      { videoId: 'aaa', title: 'A', published: '2026-06-13T00:00:00+00:00' },
      { videoId: 'ccc', title: 'C', published: '2026-06-11T00:00:00+00:00' },
    ])
  })

  it('全部已收錄時回空陣列', () => {
    expect(selectNewEntries(entries, new Set(['aaa', 'bbb', 'ccc']))).toEqual([])
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test select-new-entries`
Expected: FAIL（`selectNewEntries` 不存在）。

- [ ] **Step 3: 實作 `selectNewEntries`**

`lib/youtube/rss.ts` 追加：

```ts
export function selectNewEntries(entries: FeedEntry[], existingIds: Set<string>): FeedEntry[] {
  return entries.filter((e) => !existingIds.has(e.videoId))
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test select-new-entries`
Expected: PASS。

- [ ] **Step 5: 建 service-role client**

新增 `lib/supabase/admin.ts`：

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// service-role client：繞過 RLS，供 cron / 同步服務在無登入 session 下寫入。
// 純走 PostgREST，不開 Realtime，故 Node/serverless 環境安全。
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  return createClient(env.SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

- [ ] **Step 6: 實作同步服務**

新增 `lib/covers/sync-youtube.ts`：

```ts
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'
import { fetchChannelFeed, parseCoverTitle, selectNewEntries } from '@/lib/youtube/rss'

export type SyncResult = { created: number; skipped: number }

export async function syncYouTubeDrafts(): Promise<SyncResult> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID
  if (!channelId) throw new Error('Missing env: YOUTUBE_CHANNEL_ID')

  const supabase = createAdminClient()

  // 1. 既有 youtube 連結 → 已收錄 videoId 集合
  const { data: links, error: linkErr } = await supabase
    .from('cover_links')
    .select('url')
    .eq('platform', 'youtube')
  if (linkErr) throw linkErr
  const existing = new Set<string>()
  for (const l of links ?? []) {
    const id = extractYouTubeId(l.url)
    if (id) existing.add(id)
  }

  // 2. 抓 RSS → 過濾新片
  const feed = await fetchChannelFeed(channelId)
  const fresh = selectNewEntries(feed, existing)

  // 3. 逐筆建草稿
  let created = 0
  for (const entry of fresh) {
    const { song, artist } = parseCoverTitle(entry.title)
    const { data: cover, error: coverErr } = await supabase
      .from('covers')
      .insert({
        status: 'draft',
        title: song ?? entry.title, // 解析失敗放原始標題
        original_artist: artist ?? '',
        cover_date: entry.published.slice(0, 10),
        thumbnail_url: youtubeThumbnail(entry.videoId),
      })
      .select('id')
      .single()
    if (coverErr) throw coverErr

    const { error: linkInsErr } = await supabase.from('cover_links').insert({
      cover_id: cover.id,
      platform: 'youtube',
      platform_label: null,
      url: `https://www.youtube.com/watch?v=${entry.videoId}`,
    })
    if (linkInsErr) throw linkInsErr
    created += 1
  }

  return { created, skipped: feed.length - fresh.length }
}
```

- [ ] **Step 7: 型別檢查與既有測試**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: 無型別錯誤；測試全綠。

- [ ] **Step 8: Commit**

```bash
git add lib/youtube/rss.ts lib/supabase/admin.ts lib/covers/sync-youtube.ts tests/lib/select-new-entries.test.ts
git commit -m "feat(covers): syncYouTubeDrafts service with dedup + admin client"
```

---

## Task 6: Cron route + vercel.json + 環境變數

**Files:**
- Create: `app/api/cron/youtube-sync/route.ts`
- Modify: `vercel.json`
- Modify: `.env.local.example`

> 先翻 `node_modules/next/dist/docs/` 確認 Next 16 route handler 寫法。

- [ ] **Step 1: 寫 cron route**

新增 `app/api/cron/youtube-sync/route.ts`：

```ts
import { NextResponse } from 'next/server'
import { syncYouTubeDrafts } from '@/lib/covers/sync-youtube'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await syncYouTubeDrafts()
  return NextResponse.json(result)
}
```

- [ ] **Step 2: 註冊 cron**

`vercel.json` 改為：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["hnd1"],
  "crons": [{ "path": "/api/cron/youtube-sync", "schedule": "0 16 * * *" }]
}
```

> `0 16 * * *` UTC = 台灣每晚 00:00。Vercel Hobby 方案 cron 上限一天一次，符合需求。

- [ ] **Step 3: 補環境變數說明**

`.env.local.example` 追加（值留空，實際值另設）：

```
# YouTube 排程同步
YOUTUBE_CHANNEL_ID=
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

> 本機 `.env.local` 與 Vercel 專案環境變數都要實際填入。`YOUTUBE_CHANNEL_ID` 由使用者頻道連結換出的 `UCxxxx`；`CRON_SECRET` 用隨機字串。

- [ ] **Step 4: 本機整合驗證**

在本機 `.env.local` 填入三個變數後，啟 dev server：
Run: `pnpm dev`，另開終端：
```bash
curl -s -H "Authorization: Bearer <你的CRON_SECRET>" http://localhost:3000/api/cron/youtube-sync
```
Expected: 回 `{"created":N,"skipped":M}`；無 Authorization header 時回 401。
進 `/admin/covers` 應看到新建的草稿；公開 `/covers` 看不到。

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/youtube-sync/route.ts vercel.json .env.local.example
git commit -m "feat(covers): cron route + schedule for nightly YouTube sync"
```

---

## Task 7: saveCover 加 status + 表單發布按鈕 + 編輯頁讀草稿

**Files:**
- Modify: `app/admin/covers/actions.ts`
- Modify: `components/admin/cover-form.tsx`
- Modify: `app/admin/covers/[id]/edit/page.tsx`

- [ ] **Step 1: `saveCover` 支援 status**

`app/admin/covers/actions.ts` — 把 `saveCover` 簽名與寫入改為：

```ts
export async function saveCover(input: {
  id?: string
  values: CoverFormValues
  status?: 'draft' | 'published'
}) {
  const parsed = coverFormSchema.safeParse(input.values)
  if (!parsed.success) throw new Error('表單資料不合法')
  const values = parsed.data
  const supabase = await createClient()

  let coverId = input.id
  if (coverId) {
    const { error } = await supabase
      .from('covers')
      .update({
        title: values.title,
        original_artist: values.original_artist,
        cover_date: values.cover_date,
        description: values.description,
        tags: values.tags,
        thumbnail_url: values.thumbnail_url,
        // 只有明確指定時才改 status（避免編輯已發布項目時被動降級）
        ...(input.status ? { status: input.status } : {}),
      })
      .eq('id', coverId)
    if (error) throw error
    const { error: delErr } = await supabase.from('cover_links').delete().eq('cover_id', coverId)
    if (delErr) throw delErr
  } else {
    const { data, error } = await supabase
      .from('covers')
      .insert({
        title: values.title,
        original_artist: values.original_artist,
        cover_date: values.cover_date,
        description: values.description,
        tags: values.tags,
        thumbnail_url: values.thumbnail_url,
        status: input.status ?? 'published', // 手動新增預設直接發布
      })
      .select('id')
      .single()
    if (error) throw error
    coverId = data.id
  }

  const linkRows = values.links.map((l) => ({
    cover_id: coverId!,
    platform: l.platform,
    platform_label: l.platform_label,
    url: l.url,
  }))
  const { error: insErr } = await supabase.from('cover_links').insert(linkRows)
  if (insErr) throw insErr

  revalidatePath('/admin/covers')
  revalidatePath('/covers')
  revalidatePath(`/covers/${coverId}`)
}
```

- [ ] **Step 2: 表單支援草稿雙按鈕**

`components/admin/cover-form.tsx`：

(a) `Props` 加 `status`：
```ts
type Props = {
  initialValues?: Partial<CoverFormValues> & { id?: string }
  status?: 'draft' | 'published'
}

export function CoverForm({ initialValues, status }: Props) {
```

(b) 改 `onSubmit` 接受發布狀態，並把現有單一按鈕區塊換成條件式：
```ts
  async function onSubmit(values: CoverFormValues, publishAs?: 'draft' | 'published') {
    await saveCover({ id: initialValues?.id, values, status: publishAs })
    router.push('/admin/covers')
    router.refresh()
  }
```

把表單底部按鈕區（`<div className="flex justify-end gap-2 pt-2">…</div>`）替換為：
```tsx
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
        {status === 'draft' ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSubmit((v) => onSubmit(v, 'draft'))}
            >
              先存草稿
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((v) => onSubmit(v, 'published'))}
            >
              {isSubmitting ? '發布中⋯' : '發布'}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '儲存中⋯' : '儲存'}
          </Button>
        )}
      </div>
```

> 註：草稿用 `type="button"` + `handleSubmit(...)` 包裝，讓兩顆按鈕各自帶 publish 狀態仍享有 zod 驗證；已發布／新增維持原本 `type="submit"` 流程。`form` 的 `onSubmit={handleSubmit(onSubmit)}` 保留（已發布單鈕走這條）。

- [ ] **Step 3: 編輯頁讀草稿並傳 status**

`app/admin/covers/[id]/edit/page.tsx`：
```tsx
  const cover = await getCoverById(id, { includeDrafts: true })
  if (!cover) notFound()
```
並在 `<CoverForm>` 加 prop（`cover.status` 已於 Task 1 加進 `Cover` 型別）：
```tsx
      <CoverForm
        status={cover.status}
        initialValues={{ ...
```

- [ ] **Step 4: 型別檢查與測試**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: 無錯誤、測試全綠。

- [ ] **Step 5: Commit**

```bash
git add app/admin/covers/actions.ts components/admin/cover-form.tsx app/admin/covers/[id]/edit/page.tsx
git commit -m "feat(covers): publish/draft buttons in cover form; edit reads drafts"
```

---

## Task 8: admin 待補草稿區塊 + 立即同步

**Files:**
- Modify: `app/admin/covers/actions.ts`（加 `syncDraftsNow`）
- Modify: `app/admin/covers/page.tsx`
- Create: `app/admin/covers/sync-button.tsx`

- [ ] **Step 1: 加「立即同步」server action**

`app/admin/covers/actions.ts` 追加（檔案頂部已有 `'use server'`）：
```ts
import { syncYouTubeDrafts } from '@/lib/covers/sync-youtube'

export async function syncDraftsNow() {
  const result = await syncYouTubeDrafts()
  revalidatePath('/admin/covers')
  return result
}
```
> 此 action 在 admin 區（已由 middleware/layout 限制登入）觸發；`syncYouTubeDrafts` 內部用 service-role client，與 cron 共用同一段邏輯。

- [ ] **Step 2: admin 清單拆「待補草稿」置頂區塊 + 同步按鈕**

`app/admin/covers/page.tsx` 改為（重點：`includeDrafts:true`、依 status 分組、加同步按鈕）：

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { listCovers } from '@/lib/covers/queries'
import type { CoverWithLinks } from '@/lib/covers/types'
import { DeleteButton } from './delete-button'
import { SyncButton } from './sync-button'

export const dynamic = 'force-dynamic'

function CoverRow({ c }: { c: CoverWithLinks }) {
  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <div className="truncate font-semibold">{c.title}</div>
        <div className="text-muted-foreground truncate text-xs">
          {c.original_artist || '（待補原唱）'} · {c.cover_date} · {c.cover_links.length} 個連結
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link href={`/admin/covers/${c.id}/edit`}>
          <Button variant="ghost" size="sm">
            {c.status === 'draft' ? '補資料' : '編輯'}
          </Button>
        </Link>
        <DeleteButton id={c.id} title={c.title} />
      </div>
    </li>
  )
}

export default async function AdminCoversPage() {
  const { items, total } = await listCovers(
    { sort: 'newest', limit: 200, offset: 0 },
    { includeDrafts: true },
  )
  const drafts = items.filter((c) => c.status === 'draft')
  const published = items.filter((c) => c.status === 'published')

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">翻唱管理</h1>
          <p className="text-muted-foreground text-sm">共 {total} 首</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Link href="/admin/covers/new">
            <Button>＋ 新增翻唱</Button>
          </Link>
        </div>
      </div>

      {drafts.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">待補草稿（{drafts.length}）</h2>
          <p className="text-muted-foreground text-xs">
            排程自動抓進來的新片，補上各平台連結後按「發布」。
          </p>
          <ul className="divide-border border-primary/40 bg-card mt-2 divide-y rounded-2xl border">
            {drafts.map((c) => (
              <CoverRow key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}

      <ul className="divide-border border-border bg-card mt-4 divide-y rounded-2xl border">
        {published.map((c) => (
          <CoverRow key={c.id} c={c} />
        ))}
        {published.length === 0 && (
          <li className="text-muted-foreground px-4 py-6 text-center text-sm">
            還沒有已發布的翻唱
          </li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: 同步按鈕 client 元件**

新增 `app/admin/covers/sync-button.tsx`：
```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { syncDraftsNow } from './actions'

export function SyncButton() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-muted-foreground text-xs">{msg}</span>}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await syncDraftsNow()
            setMsg(`新增 ${r.created}、略過 ${r.skipped}`)
          })
        }
      >
        {pending ? '同步中⋯' : '立即同步'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: 型別檢查與測試**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: 無錯誤、測試全綠。

- [ ] **Step 5: 端到端手動驗證**

1. `pnpm dev`
2. 進 `/admin/covers` 按「立即同步」→ 出現「待補草稿」區塊與新草稿
3. 公開 `/covers` 看不到草稿；直接開草稿的 `/covers/<id>` → 404
4. 點草稿「補資料」→ 補四個平台連結 → 按「發布」→ 回清單，項目移到已發布區
5. `/covers` 出現該翻唱

- [ ] **Step 6: Commit**

```bash
git add lib/covers/types.ts app/admin/covers/actions.ts app/admin/covers/page.tsx app/admin/covers/sync-button.tsx
git commit -m "feat(covers): drafts section + manual sync button in admin"
```

---

## 完工檢查

- [ ] `pnpm test` 全綠（含 3 個新單測檔）
- [ ] `pnpm exec tsc --noEmit` 無錯
- [ ] `pnpm lint` 無錯
- [ ] 公開頁完全看不到草稿（清單／詳情／熱門原唱統計）
- [ ] cron route 無 `CRON_SECRET` header 回 401
- [ ] 待補草稿補完連結發布後才上公開站
- [ ] Vercel 環境變數已設：`YOUTUBE_CHANNEL_ID`、`CRON_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`
```

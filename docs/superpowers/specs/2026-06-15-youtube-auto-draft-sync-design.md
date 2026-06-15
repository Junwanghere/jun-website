# YouTube 排程自動建草稿 — 設計文件

日期：2026-06-15
範圍：發片後減少在 admin 手動建檔的負擔。新增「Vercel Cron 定時讀 YouTube RSS → 偵測新片 → 自動建草稿（歌名/歌手/日期/縮圖/YT 連結自動填好）」，使用者只需進 admin「待補清單」補上另外四個平台連結並發布。

## 背景與問題

每發一支翻唱，要進 `/admin/covers/new` 手動填：歌名、原唱、發布日期、縮圖、以及五個平台連結（YouTube / Instagram / Threads / TikTok / 小紅書）。逐筆手打很累。

技術現實：
- **YouTube** 有公開 RSS（`youtube.com/feeds/videos.xml?channel_id=…`），免 API key、免登入，提供最新影片的標題、連結、上傳日期 → 可靠地自動抓。
- **IG / Threads / TikTok / 小紅書** 鎖登入牆 + 反爬，從伺服器排程（機房 IP、無登入 session）抓不到，官方 API 要逐平台建 App + 審核 + 維護 token，為個人站不划算 → 這四個連結一律由使用者手動提供。

YouTube 影片標題大多遵循 `〈歌名〉- 歌手 (Cover by Jun)` 格式，但有例外。

## 需求

1. Cron 定時（**台灣時間每晚 12 點**）讀 YouTube RSS，偵測尚未收錄的新片。
2. 每支新片自動建一筆 **草稿**：歌名、歌手（從標題解析）、上傳日期、縮圖、YouTube 連結。
3. 標題解析失敗時仍照樣建草稿，title 先放原始標題，使用者進去改。
4. 草稿在「發布」前**不得出現在公開網站**（清單、詳情頁、熱門原唱統計都要排除）。
5. admin 有「待補草稿」置頂區塊；使用者補完四個平台連結後可「發布」。
6. 提供手動「立即同步」按鈕，剛發完片可即時觸發，不必等排程。
7. 去重：同一支 YouTube 影片永遠只建一次（即使排程一天多跑或手動觸發）。

## 方案（已選定）

**方案 D：排程自動建草稿，使用者補四條網址。** 排程吃下「發現新片 + metadata + YT 連結」，人只剩「貼四條網址 + 發布」。

### 整體資料流

```
每晚 12 點 Vercel Cron ─→ GET /api/cron/youtube-sync (驗 CRON_SECRET)
        │
        └─→ syncYouTubeDrafts()
              ├─ 讀 YOUTUBE_CHANNEL_ID 的 RSS → [{ videoId, title, published }]
              ├─ 查現有 cover_links(platform=youtube) → 抽出已收錄 videoId 集合
              ├─ 過濾掉已收錄 → 新片
              └─ 每支新片：
                   parseCoverTitle(title) → { song, artist }（失敗回 null）
                   insert covers { status:'draft', title:song??原始標題,
                                   original_artist:artist??'', cover_date:published,
                                   thumbnail_url:youtubeThumbnail(videoId) }
                   insert cover_links { platform:'youtube', url }
        │
admin 翻唱管理頁「待補草稿 (N)」置頂區塊 ←─ listCovers(includeDrafts) 撈 draft
        │
使用者點草稿 → 編輯表單（YT 資料已填）→ 貼 IG/Threads/TikTok/小紅書四條
        │
        ├─「發布」  → saveCover(status:'published') → 上公開站
        └─「先存草稿」→ saveCover(status:'draft')     → 留待補
```

公開頁面查詢預設只給 `published`；草稿直連詳情頁 404。

## 檔案

### 新增

**`supabase/migrations/0005_cover_status.sql`**
- `covers` 加欄 `status text not null default 'published' check (status in ('draft','published'))`
  - 加欄時既有 row 自動套預設值 `published`，不受影響
- 加索引 `covers_status_idx on covers(status)`
- 重建 view `cover_artist_counts`，加 `where status = 'published'`（草稿不灌熱門統計）

**`lib/youtube/rss.ts`**
- `fetchChannelFeed(channelId): Promise<FeedEntry[]>` — fetch RSS XML，輕量解析（不加 XML 套件依賴）取出 `videoId` / `title` / `published`
- `parseCoverTitle(rawTitle): { song: string | null; artist: string | null }`
  - 命中 `〈歌名〉- 歌手 (Cover by Jun)`（只認全形書名號 `〈〉`）→ 拆出 song / artist
  - 其餘一律當解析失敗，兩者回 `null`，不丟錯
- 型別 `FeedEntry = { videoId: string; title: string; published: string }`

**`lib/covers/sync-youtube.ts`**（`server-only`）
- `syncYouTubeDrafts(): Promise<{ created: number; skipped: number }>`
  1. service-role Supabase client（cron 無登入 session，需繞 RLS 寫入）
  2. 查現有 `cover_links` where `platform='youtube'`，用 `extractYouTubeId` 抽出已收錄 videoId → Set
  3. `fetchChannelFeed` → 過濾掉已收錄 → 新片
  4. 逐筆 `parseCoverTitle` + insert `covers`(draft) + insert `cover_links`(youtube)
  5. 回傳摘要

**`app/api/cron/youtube-sync/route.ts`**
- `GET` handler：驗 `Authorization === 'Bearer ' + process.env.CRON_SECRET`，不符回 401
- 通過 → `await syncYouTubeDrafts()` → 回 JSON 摘要

**admin「立即同步」server action 與按鈕**
- server action（authenticated client 即可，使用者已登入）呼叫同一套同步邏輯（與 cron 共用）
- 放在 admin 翻唱管理頁的按鈕，點擊即時觸發

### 修改

**`vercel.json`**
- 加 `crons: [{ path: '/api/cron/youtube-sync', schedule: '0 16 * * *' }]`（UTC 16:00 = 台灣 00:00）

**`lib/covers/queries.ts`**
- `listCovers(query, opts?: { includeDrafts?: boolean })`：預設加 `.eq('status','published')`；`includeDrafts:true` 時不加
- `getCoverById(id, opts?: { includeDrafts?: boolean })`：同上，公開詳情頁草稿回 null → 404
- 公開呼叫端（`/covers`、`/covers/[id]`、`loadMoreCovers`）不傳 → 只看 published

**`app/admin/covers/page.tsx`**
- 用 `listCovers({...}, { includeDrafts: true })` 撈全部
- 最上面開「待補草稿 (N)」置頂區塊列出 `status==='draft'` 的項目；其餘照舊
- 放「立即同步」按鈕

**`app/admin/covers/[id]/edit/page.tsx`**
- `getCoverById(id, { includeDrafts: true })`，讓草稿能被開啟編輯
- 把 cover 的 `status` 傳進 `CoverForm`

**`app/admin/covers/actions.ts` `saveCover`**
- 加 `status` 參數，寫入 `covers.status`；不傳時維持現有行為（手動新增預設 published）

**`components/admin/cover-form.tsx`**
- 接收 `status`；草稿時底部顯示兩顆按鈕「發布」（存 + `published`）/「先存草稿」（存 + `draft`）；已發布維持單顆「儲存」

### 環境變數

- `YOUTUBE_CHANNEL_ID` — 由使用者的頻道連結換出的 `UCxxxx`（`.env.local` + Vercel）
- `CRON_SECRET` — 隨機字串，保護 cron 路由（`.env.local` + Vercel）
- `SUPABASE_SERVICE_ROLE_KEY` — 本機已有；上線需加進 Vercel（cron 寫入用）

## 測試

- **單元（vitest）**：
  - `parseCoverTitle` — 正常格式、含例外標題（中英文、缺書名號）→ 失敗回 null
  - `fetchChannelFeed` 解析 — 餵假的 RSS XML，驗證取出 videoId/title/published
  - 去重 — 已收錄 videoId 要被跳過
- **整合驗證**：本機 supabase 跑 0005 migration → 手動觸發同步 → 草稿建出、公開頁看不到、補完連結發布後才出現
- 現有 covers 測試需維持通過

## 範圍外（YAGNI）

- ❌ 不自動抓 IG / Threads / TikTok / 小紅書（技術上不划算）
- ❌ 不自動發布（草稿必須人工補完連結才上線 — 安全閥）
- ❌ 不做批次匯入多支的特殊 UI（平常一支一支發，現有編輯流程足夠）

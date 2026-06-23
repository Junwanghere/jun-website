# SEO：每頁 metadata + OG + sitemap + robots + JSON-LD — 設計文件

日期：2026-06-23
範圍：補齊網站 SEO。目前只有 `app/layout.tsx` 一個全站 title/description，每頁共用、無 OG、無 sitemap/robots、無結構化資料。本工作補上各頁獨立 metadata、Open Graph、sitemap、robots、JSON-LD，並把 admin/login 設為 noindex。

正式網址：`https://jun-website-chi.vercel.app`（Vercel 預設；之後接自訂網域只改一處）。

## 需求

1. 每個公開頁有自己的 title / description；翻唱頁(`/covers/[id]`)每首各自獨立，OG 圖用該片縮圖。
2. Open Graph / Twitter card（社群貼連結有縮圖預覽）。
3. `sitemap.xml` 動態包含所有已發布翻唱頁。
4. `robots.txt` 開放公開、擋 `/admin` `/login` `/api`、指向 sitemap。
5. admin / login 頁 `noindex`。
6. JSON-LD：首頁 Person + WebSite、翻唱頁 MusicRecording。

## 方案

### 共用常數 `lib/site.ts`
- `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jun-website-chi.vercel.app'`
- `SITE_NAME = 'Jun Wang'`、作者資訊等。接自訂網域時設環境變數即可，不必改碼。

### 全站底 `app/layout.tsx`
`metadata` 擴充：
- `metadataBase: new URL(SITE_URL)`
- `title: { default: '王嘉駿 · Jun Wang', template: '%s｜Jun Wang' }`
- `description`（沿用/微調）
- `openGraph`（type website、siteName、locale `zh_TW`、預設 images = `/jun-profile.jpg`）
- `twitter`（`summary_large_image`）
- `alternates.canonical` 由各頁/預設提供

### 每頁 metadata
- **`app/covers/page.tsx`**：`export const metadata = { title: '翻唱', description: '王嘉駿翻唱過的歌', openGraph/alternates }`
- **`app/about/page.tsx`**：`export const metadata = { title: '關於我', description: '我是王嘉駿' }`
- **`app/covers/[id]/page.tsx`**：
  - 把 `getCoverById` 用 React `cache()` 包一層（`lib/covers/queries.ts` 匯出 cached 版或在頁內 cache），讓 `generateMetadata` 與頁面共用同一次查詢，不重複打 DB。
  - `generateMetadata({ params })`：撈 cover → 標題 `${formatSongTitle(title)} - ${original_artist}`、description（取 `description` 前 ~80 字，無則用「王嘉駿翻唱〈歌名〉」）、`openGraph.images = [thumbnail_url]`、`alternates.canonical = /covers/${id}`。撈不到回最小 metadata（頁面本身已 `notFound()`）。

### `app/sitemap.ts`（新）
- `MetadataRoute.Sitemap`：靜態頁（`/`、`/covers`、`/about`）+ 動態已發布翻唱頁。
- 用 cookieless client（`createAdminClient`，service role）查 `covers` where `status='published'` select `id, updated_at`，明確只取 published。
- 每筆 `url`、`lastModified`(updated_at)、合理 `changeFrequency`/`priority`。

### `app/robots.ts`（新）
- `rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/login', '/api'] }`
- `sitemap: ${SITE_URL}/sitemap.xml`

### noindex
- `app/admin/layout.tsx`、`app/login/page.tsx`：`export const metadata = { robots: { index: false, follow: false } }`

### JSON-LD `lib/seo/jsonld.ts`（純函式 builder）
- `personJsonLd()` → Person（name 王嘉駿/Jun Wang、url、sameAs 社群連結）
- `websiteJsonLd()` → WebSite（name、url）
- `musicRecordingJsonLd(cover)` → MusicRecording（name=歌名、byArtist=MusicGroup{original_artist}、url、可選 thumbnailUrl）
- 在首頁與翻唱頁以 `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />` 注入。

## 測試
- **單元（vitest）**：`lib/seo/jsonld.ts` 三個 builder — 結構、必填欄位、特殊字元（歌名含 `〈〉`、引號）正確序列化。
- **整合**：`pnpm build` 通過；抽查 `/covers/[id]` 的 `<title>`、og:image、JSON-LD 輸出正確；`/sitemap.xml`、`/robots.txt` 內容正確且含/排除正確路徑。
- 現有測試維持通過。

## 範圍外（YAGNI）
- ❌ 不啟用 Cache Components（另議）。
- ❌ 不做動態產生的設計版 OG 圖（先用頭像/縮圖）。
- ❌ 不做多語 hreflang（單語站）。

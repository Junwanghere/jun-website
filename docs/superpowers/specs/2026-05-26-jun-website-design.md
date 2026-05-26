# Jun Website 設計文件

日期：2026-05-26
作者：王嘉駿（與 Claude 共同整理）
狀態：待使用者審閱

## 1. 專案概述

打造一個個人部落格／作品集網站，承載「前端工程師」與「音樂人」兩種身分。

整體目標（依重要性，本 spec 只實作前兩階段的基礎）：

1. 撰寫文章（技術文 ＋ 心情雜記）
2. 讓他人更認識作者
3. 展現技術力，作為未來跳槽的作品集之一
4. 展現作品集（音樂、網頁技術）
5. 讓音樂追蹤者查詢翻唱清單並前往各平台
6. 透過這個專案學習新技術

學習目標具體化：作者目前主力是 React + Vite（SPA），這個專案要往 Next.js（App Router、Server Components、SSR/SSG）與全端（Supabase、資料庫、認證）延伸。

## 2. 範圍與分期

整體拆成多個階段，每階段各自有獨立的 spec → 計畫 → 實作循環。本文件只涵蓋 Phase 0 與 Phase 1。

### Phase 0 — 地基

- Next.js（App Router）＋ TypeScript 專案骨架
- Tailwind CSS、ESLint、Prettier
- 設計系統：色彩 token（莫蘭迪色系，主色霧藍灰）、字體、間距尺標、亮／暗雙模式切換
- 全站版型外殼：導覽列、頁尾、響應式
- 本機 Supabase 串接（透過 OrbStack 提供 Docker 相容環境）：資料庫連線、環境變數、migration 流程
- 認證骨架：只有作者的 email 能登入後台
- 首頁（連結傳送門版型：頭像／身分／社群／各區入口卡片）

### Phase 1 — 翻唱功能

- 公開翻唱列表頁：搜尋、依平台／原唱／類型篩選、排序、載入更多
- 翻唱詳情頁：可內嵌 YouTube 播放器、顯示心得與各平台連結
- 後台：翻唱的新增／編輯／刪除，含縮圖上傳與多平台連結管理

### 不在本次範圍（未來各自獨立 spec）

- 文章／部落格（後台寫作、Markdown 渲染、程式碼高亮）
- 關於我頁面
- 作品集頁面（音樂 ＋ 網頁專案）
- 部署上線（暫時只在本機開發）
- 英文版／多語系

## 3. 技術架構

單一 Next.js 全端 app，前後端同一專案。

- **框架**：Next.js（App Router）＋ TypeScript。公開頁面以 Server Components 在伺服器端取資料（利於 SEO，也是學習重點）
- **樣式**：Tailwind CSS；主題色彩以 CSS 變數做 token，暗色模式用 class 策略切換
- **UI 元件**：shadcn/ui（建構於 Radix UI ＋ Tailwind 之上、把元件複製到 repo 自行擁有），客製化以符合莫蘭迪設計系統。表單以 React Hook Form ＋ Zod 處理驗證
- **後端／資料庫**：本機 Supabase（Postgres）。以 `@supabase/ssr` 串接，分伺服器端與瀏覽器端兩種 client
- **認證**：Supabase Auth，email ＋ 密碼，僅允許白名單 email 登入
- **檔案儲存**：Supabase Storage，存翻唱縮圖
- **部署**：本階段不部署，但架構保持「之後可一鍵上 Vercel」的乾淨狀態

### 路由

```
/                         首頁
/covers                   翻唱列表（搜尋／篩選／排序／載入更多）
/covers/[id]              翻唱詳情
/login                    後台登入
/admin                    後台首頁
/admin/covers             翻唱管理列表
/admin/covers/new         新增翻唱
/admin/covers/[id]/edit   編輯翻唱
```

## 4. 資料模型

兩張主表，一對多關係。

### `covers`（翻唱）

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid (pk) | 主鍵 |
| title | text | 歌名 |
| original_artist | text | 原唱 |
| cover_date | date | 翻唱發布日 |
| thumbnail_url | text, null | 縮圖（Supabase Storage） |
| description | text, null | 心得／簡介 |
| tags | text[], null | 類型標籤，供篩選 |
| created_at | timestamptz | 建立時間 |
| updated_at | timestamptz | 更新時間 |

### `cover_links`（平台連結，一首對多筆）

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid (pk) | 主鍵 |
| cover_id | uuid (fk) | 對應 covers.id，刪翻唱時連帶刪（on delete cascade） |
| platform | text | youtube / instagram / threads / other |
| platform_label | text, null | platform 為 other 時填，例如 StreetVoice |
| url | text | 連結 |

### 權限（RLS）

- `covers`、`cover_links`：所有人可讀（SELECT）；新增／修改／刪除僅限已登入使用者
- 縮圖 Storage bucket：公開讀，已登入才能寫
- 由於只有作者能通過登入，「已登入」即等同「管理者」

## 5. 翻唱功能

### 公開列表頁 `/covers`

- 查詢條件以網址參數表示：`q`（關鍵字）、`platform`、`tag`、`sort`、分頁游標
- 搜尋：對 `title` 與 `original_artist` 做模糊比對（ilike）
- 篩選：依平台（join `cover_links`）、依類型標籤
- 排序：依 `cover_date` 最新／最舊
- 分頁：「載入更多」按鈕，採 range／keyset 分頁；初始為伺服器端渲染，載入更多由 client 元件呼叫 route handler 或 server action
- 每筆顯示：縮圖、歌名、原唱、日期、平台連結標記（YT／IG／TH／其他）

### 詳情頁 `/covers/[id]`

- 顯示縮圖、歌名、原唱、日期、心得
- 若有 YouTube 連結，內嵌播放器
- 列出所有平台連結按鈕
- 利於 SEO 與分享

### 後台 `/admin/covers`

- 列表：顯示所有翻唱，可進入編輯或刪除
- 新增／編輯表單：
  - 基本欄位：歌名、原唱、發布日、心得、類型標籤
  - 縮圖：上傳圖片到 Storage；或貼 YouTube 連結時自動帶入 YouTube 縮圖
  - 平台連結：可動態新增／移除多列（平台、連結、必要時的自訂平台名稱）
  - 表單驗證：必填、網址格式
- 刪除：需二次確認；連帶刪除其 `cover_links`

## 6. 認證與權限

- Supabase Auth，email ＋ 密碼
- 以環境變數設定允許登入的 email 白名單
- Next.js middleware 保護 `/admin/*`：未登入或非白名單者導回 `/login`
- 後台版型與公開站分離

## 7. 設計系統

風格：柔和圓角的「個人傳送門」調性 ＋ 莫蘭迪色系。

- **色彩**：莫蘭迪色系，整套低彩度、加灰、彼此和諧
  - 主色：霧藍灰 `#737F84`，用於頭像、連結箭頭、選中態、強調細節
  - 輔色（給縮圖、分類標籤等做和諧變化）：霧橄綠 `#8B9279`、霧陶粉 `#B0928A`、霧灰紫 `#94889A`、霧米褐 `#A8A092`
  - 背景：亮模式淺暖灰 `#EAE8E3`；卡片底 `#F6F4F0`
  - 文字：主文字 `#3A3835`（近黑灰，避免純黑以符合莫蘭迪精神）；次要 `#8F8A83`；極淡 `#A39D95`
  - 亮／暗各一套 token，以 CSS 變數切換；暗模式以對應的深莫蘭迪灰為主
- **字體**：介面與標題用 Inter，中文搭 Noto Sans TC；標籤、日期、數字用等寬字（JetBrains Mono）。文章內文之後可加襯線字
- **字級尺標**：12 / 14 / 16 / 20 / 28 / 40
- **版面語言**：行動優先、單欄置中（內容欄寬約 360–480px，桌機亦保持窄欄居中）。卡片大圓角（16–20px）、膠囊按鈕／搜尋框、柔和陰影、低對比細節、留白充足。不做傳統頂部 nav 分頁，以「卡片入口」為主
- **首頁版型**：連結傳送門——頭像、名字＋身分、社群圖示、然後一張張卡片連到各區（翻唱卡為主視覺，文章／作品集／關於我為次）
- **共用元件**：以 shadcn/ui 為基底客製化——頭像、社群圓鈕、入口卡片、膠囊按鈕／篩選、搜尋膠囊、輸入框、亮暗切換鈕
- **無障礙**：文字對比達 WCAG AA；莫蘭迪色雖低彩度仍須驗證主色與背景／文字的對比；點綴色不作為唯一資訊指示；支援鍵盤操作與 prefers-reduced-motion

## 8. 測試策略

- **開發方式**：採 TDD，先寫測試再寫實作
- **單元／元件測試**：Vitest ＋ React Testing Library。涵蓋查詢參數解析、查詢建構、表單驗證、關鍵元件
- **端對端測試**：Playwright。涵蓋翻唱頁搜尋／篩選、後台新增到前台顯示的完整流程、登入保護
- **資料層**：針對 RLS 政策驗證讀寫權限是否正確

## 9. 開發環境與工具

- **前置需求**：Node.js、OrbStack（或其他 Docker 相容執行環境，本機 Supabase 需要）、Supabase CLI、shadcn/ui CLI
- **本機 Supabase**：以 Supabase CLI 啟動本機完整堆疊（Postgres、Auth、Studio），完全離線。容器執行環境採 OrbStack（macOS 上 Docker Desktop 的快速替代）
- **UI 元件**：使用 shadcn/ui CLI 按需新增元件到 repo（元件以原始碼形式存在 repo，不是依賴套件）
- **Migration**：schema 變更全部以 migration 檔納入版本控制
- **程式風格**：ESLint ＋ Prettier
- **環境變數**：Supabase 連線資訊、admin email 白名單，放 `.env.local`（不進版控）

## 10. 已定案的關鍵選擇

- 技術棧：Next.js（App Router）＋ Supabase ＋ Vercel（未來）
- UI 元件庫：shadcn/ui（Radix UI ＋ Tailwind 基底，元件複製到 repo 客製化）
- 容器執行環境：OrbStack
- 內容管理：自建登入後台
- 視覺：柔和圓角傳送門式 ＋ 莫蘭迪色系，主色霧藍灰 #737F84，亮／暗雙模式
- 分頁：載入更多按鈕
- 縮圖：核心為手動上傳，YouTube 連結可自動帶縮圖
- 翻唱詳情頁：做（輕量，可內嵌播放器）
- 登入：email ＋ 密碼
- 本階段只在本機開發，不部署

## 11. 開放問題

目前無未決問題。網域與部署待未來階段再定。

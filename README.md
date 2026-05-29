# Jun Website

王嘉駿（Jun Wang）個人網站。前端工程師 ／ 音樂人。

## 技術棧

Next.js（App Router）／ TypeScript ／ Tailwind CSS v4 ／ shadcn/ui（Base UI）／ React Hook Form ＋ Zod ／ Supabase（Postgres ＋ Auth ＋ Storage）／ Vitest ／ Playwright。

## 開發環境前置需求

- Node.js 20+
- pnpm
- OrbStack（或其他 Docker 相容環境）
- Supabase CLI（`brew install supabase/tap/supabase`）

## 第一次起動

任何一台新電腦，照以下步驟即可重現完整本機環境：

```bash
git clone <repo-url>
cd jun-website
pnpm install
cp .env.local.example .env.local   # keys 已是本機固定預設值，通常不需修改
supabase start                      # 啟動本機 Supabase（OrbStack/Docker 需執行中）
pnpm db:reset                       # 套用 migration + 建 admin 帳號 + 灌入 covers 真資料
pnpm dev                            # http://localhost:3000
```

`pnpm db:reset` 會自動建立 admin 帳號（帳密取自 `.env.local` 的 `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`，需與 `ADMIN_EMAIL_ALLOWLIST` 相符），**不需要再手動到 Studio 建帳號**。
之後要把資料庫重置回乾淨一致狀態，隨時再跑一次 `pnpm db:reset` 即可。

## 測試

```bash
pnpm test          # 單元 ＋ 元件（Vitest）
pnpm test:e2e      # 端對端（Playwright，會自動拉 dev server）
pnpm lint
pnpm format:check
```

## 常用指令

| 指令                               | 說明                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `supabase start` / `supabase stop` | 啟動／停止本機 Supabase 堆疊                                         |
| `supabase status`                  | 顯示本機 API URL、anon／service role key、Studio URL                 |
| `supabase db reset`                | 套用所有 migration 並重置 DB（會清掉 auth users，需重建 admin 帳號） |
| `pnpm db:reset`                    | 重置 DB：套 migration + 建 admin + 灌 covers（一鍵還原一致狀態）     |
| `pnpm seed:admin`                  | 冪等建立本機 admin 帳號                                              |
| `supabase migration new <name>`    | 產生新的 migration 檔                                                |
| `pnpm dev`                         | 啟動 Next.js dev server                                              |
| `pnpm build`                       | 編譯生產版本                                                         |

## 資料夾

- `app/` — Next.js 路由（公開頁面、`/admin` 後台）
- `components/` — UI 元件（`ui/` 為 shadcn 複製的元件）
- `lib/` — 純邏輯：Supabase client、covers 查詢、Zod schema、YouTube 工具
- `supabase/` — 本機 Supabase 設定與 migrations
- `tests/` — Vitest 單元／元件
- `e2e/` — Playwright

## 路由

| 路徑                      | 說明                             | 權限           |
| ------------------------- | -------------------------------- | -------------- |
| `/`                       | 首頁（連結傳送門）               | 公開           |
| `/covers`                 | 翻唱列表（搜尋／篩選／載入更多） | 公開           |
| `/covers/[id]`            | 翻唱詳情（含 YouTube 內嵌）      | 公開           |
| `/login`                  | 後台登入                         | 公開           |
| `/admin`                  | 後台首頁                         | 限白名單 email |
| `/admin/covers`           | 翻唱管理列表                     | 限白名單 email |
| `/admin/covers/new`       | 新增翻唱                         | 限白名單 email |
| `/admin/covers/[id]/edit` | 編輯翻唱                         | 限白名單 email |

## 設計與規格

- 設計文件：`docs/superpowers/specs/2026-05-26-jun-website-design.md`
- 實作計畫：`docs/superpowers/plans/2026-05-26-jun-website.md`

## 部署

目前只在本機開發。架構保持「之後一鍵上 Vercel」的乾淨狀態。

## 階段

- `phase-0-foundation` — Next.js + shadcn/ui + Supabase + Auth + 首頁傳送門
- `phase-1-covers` — 公開翻唱列表 + 詳情頁 + 後台 CRUD

未來階段（各自獨立 spec）：文章／部落格、關於我、作品集、英文版、部署上線。

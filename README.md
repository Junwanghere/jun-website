# Jun Website

王嘉駿（Jun Wang）個人網站。前端工程師 ／ 音樂人。

線上網址：<https://jun-website-chi.vercel.app>

## 技術棧

Next.js（App Router）／ TypeScript ／ Tailwind CSS v4 ／ shadcn/ui（Base UI）／ React Hook Form ＋ Zod ／ Supabase（Postgres ＋ Auth ＋ Storage）／ Vitest ／ Playwright。
部署於 Vercel，CI／CD 走 GitHub Actions。

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

## 開發流程（PR-only）

`main` 受保護，**不能直接 push**（連 repo 擁有者也不行）。所有改動一律走 Pull Request：

1. 從最新的 `main` 開分支：`git checkout main && git pull && git checkout -b <branch>`
2. 改動、commit、push，開 PR 指向 `main`
3. PR 會自動觸發 CI（見下）。兩個 check 綠燈才允許合併
4. 合併後自動部署（見「部署」）

分支保護要求的 status checks：`test-build`、`verify-migrations`（皆定義於 `.github/workflows/ci.yml`）。
緊急情況要直接推 `main`，需先到 GitHub Settings → Branches 暫時關閉保護，推完再開回。

## 權限與安全

後台（`/admin` 與所有寫入操作）限白名單管理員，採三層縱深防禦，缺一不可：

1. **middleware（`middleware.ts`）**：對 `/admin` 路徑做樂觀攔截，非白名單者導向 `/login`。這只是 UX 攔截，不是唯一防線。
2. **server action 關卡（`lib/auth/require-admin.ts`）**：每個會改資料的 server action 開頭呼叫 `requireAdmin()`，用 `getUser()` 驗 JWT ＋ 比對 `ADMIN_EMAIL_ALLOWLIST`。因為 server action 靠全域 ID 分派、可從非 `/admin` 路徑觸發，故不能只靠 middleware。
3. **資料庫 RLS**：`covers` / `cover_links` / storage 縮圖的寫入政策要求 `private.is_admin()` 為真——該函式比對 JWT 的 email 與 `admin_emails` 資料表。即使有人拿公開 anon key 直接打 PostgREST，也會被這層擋下。

其他：安全回應標頭設於 `next.config.ts`；`is_admin()` 放在不對外的 `private` schema、不經 REST 曝光。

### 新增管理員（重要：要改兩個地方，且必須一致）

- 資料層：新增一筆到 `admin_emails` 資料表（寫一個新的 migration `insert into public.admin_emails ...`）
- 應用層：把 email 加進 `ADMIN_EMAIL_ALLOWLIST` 環境變數（本機 `.env.local`、生產在 Vercel）

兩邊不一致會造成「應用層放行但資料庫擋下」或反之，後台會出現看似成功卻寫不進去的怪象。

## CI／CD

| Workflow | 觸發 | 作用 |
| -------- | ---- | ---- |
| `.github/workflows/ci.yml` | 對 `main` 的 PR | `test-build`（`pnpm test` ＋ `pnpm build`）、`verify-migrations`（全新本機 Supabase 套所有 migration，擋壞 SQL）。不連真實 DB、不需 secret |
| `.github/workflows/db-migrate.yml` | push 到 `main` 且 `supabase/migrations/**` 有變動 | 自動 `supabase db push` 把新 migration 套到生產庫 |

生產 migration 自動化需要在 GitHub repo 設兩個 secret（Settings → Secrets and variables → Actions）：

- `SUPABASE_ACCESS_TOKEN`（<https://supabase.com/dashboard/account/tokens>）
- `SUPABASE_DB_PASSWORD`（Dashboard → Project Settings → Database）

## 資料庫 migration

migration 檔採**手動序號**命名 `000X_名稱.sql`（如 `0007_advisor_hardening.sql`），依序套用。
新增時接續現有最大號碼，別用 `supabase migration new` 產生的時間戳名稱，以保持專案一致。
改完務必本機 `pnpm db:reset` 驗過再開 PR；`verify-migrations` CI 會再擋一次壞掉的 SQL。

## 常用指令

| 指令                               | 說明                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `supabase start` / `supabase stop` | 啟動／停止本機 Supabase 堆疊                                         |
| `supabase status`                  | 顯示本機 API URL、anon／service role key、Studio URL                 |
| `supabase db reset`                | 套用所有 migration 並重置 DB（會清掉 auth users，需重建 admin 帳號） |
| `supabase db advisors --linked`    | 對生產庫跑安全／效能建議檢查                                         |
| `pnpm db:reset`                    | 重置 DB：套 migration + 建 admin + 灌 covers（一鍵還原一致狀態）     |
| `pnpm seed:admin`                  | 冪等建立本機 admin 帳號                                              |
| `pnpm dev`                         | 啟動 Next.js dev server                                              |
| `pnpm build`                       | 編譯生產版本                                                         |

## 資料夾

- `app/` — Next.js 路由（公開頁面、`/admin` 後台）
- `components/` — UI 元件（`ui/` 為 shadcn 複製的元件）
- `lib/` — 純邏輯：Supabase client、covers 查詢、Zod schema、YouTube 工具、`auth/`（`requireAdmin`）
- `supabase/` — 本機 Supabase 設定與 migrations
- `tests/` — Vitest 單元／元件
- `e2e/` — Playwright
- `.github/workflows/` — CI（PR 檢查）與生產 migration 部署

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

部署於 Vercel（生產：<https://jun-website-chi.vercel.app>），與 GitHub 連動。

合併 PR 到 `main` 後會並行發生兩件事：

- **Vercel** 自動 build 並部署新版程式碼（獨立於 GitHub Actions，不等 CI）
- **`db-migrate.yml`** 若該次含 migration 變動，自動把新 migration 套到生產庫

因此 `main` 的品質靠 PR 階段的 `test-build` ／ `verify-migrations` 把關。

## 授權

版權所有，保留所有權利。原始碼公開僅供瀏覽與 CI，未授權重用。詳見 [`LICENSE`](./LICENSE)。

## 階段

- `phase-0-foundation` — Next.js + shadcn/ui + Supabase + Auth + 首頁傳送門
- `phase-1-covers` — 公開翻唱列表 + 詳情頁 + 後台 CRUD

未來階段（各自獨立 spec）：文章／部落格、關於我、作品集、英文版。

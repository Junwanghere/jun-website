# 上 GitHub + 多機本機開發可重現（Phase A）

- 日期：2026-05-29
- 分支起點：`feat/covers-revamp`
- 狀態：設計定稿，待寫實作計畫

## 目標

讓這份專案推到 GitHub private repo，並且在**任何一台新電腦**上都能用最少步驟把整個本機開發環境（schema + admin 帳號 + 種子資料）一鍵重現，之後在不同電腦間都能無痛開發。

不在本階段範圍內的事（見「不做」一節）刻意延後，避免做白工。

## 背景與現況

- 專案已使用 **Supabase CLI**（`supabase/config.toml` + `migrations/`）。`supabase start` 會自動以 Docker 拉起整套本機 Supabase——**不需要、也不應該自己寫 Dockerfile**，那會與 CLI 打架。
- Schema 已可重現：migrations 都進版控，`supabase db reset` 能重建。
- Covers 資料可重現：`pnpm seed:covers` 讀 repo 內的 `scripts/youtube-covers.json`，用 service role 打 PostgREST 重灌。
- Secrets 安全：`.env.local` 已被 `.gitignore` 忽略；git 目前只追蹤 `.env.local.example` 與 `lib/env.ts`（皆安全）。

### 現況缺口

1. **尚未推上 GitHub**（無 remote）。
2. **admin 帳號需手動到 Studio 建立**——換機器最卡的一步，未自動化。
3. **`config.toml` 指向 `./seed.sql` 但該檔不存在**——`supabase db reset` 會略過/警告。
4. 本機 Supabase 的「資料」存在該機器的 Docker volume，**不跨機同步**；跨機靠 migrations（schema）+ seed（資料）重現，而非共享同一份資料。

### 環境事實（已查證）

- Supabase CLI `2.101.0`（新版 publishable/secret key 格式）。
- `config.toml`：email auth `enable_confirmations = false` → 用 admin API 建立的帳號可直接登入，免 email 確認。
- `lib/supabase/` 已有 client/server/middleware；seed 腳本沿用「raw fetch → PostgREST」模式（避免 supabase-js 在 Node 起 Realtime WebSocket 的問題）。

## 設計

### A1 — 上 GitHub private repo

1. 把目前未提交的改動（landing page 個人照片 `public/jun-profile.jpg` + `app/page.tsx` 的相關修改）在 `feat/covers-revamp` 上 commit。
2. 再次確認無 secrets 進版控（預期僅 `.env.local.example` 被追蹤）。
3. 用 `gh repo create jun-website --private --source=. --remote=origin` 建立 private repo，推上 `main` 與 `feat/covers-revamp`。

**完成定義**：repo 在 GitHub 為 private，可在另一台機器 `git clone`。

### A2 — 一行指令重現整個本機環境

#### A2.1 `pnpm seed:admin`（新增）

- 新增 `scripts/seed-admin.mjs`，沿用 `scripts/seed-youtube-covers.mjs` 的模式：手寫 parser 讀 `.env.local`，用 `fetch` 呼叫 Supabase GoTrue 的 admin endpoint。
- 行為：
  - 讀 `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`E2E_ADMIN_EMAIL`、`E2E_ADMIN_PASSWORD`。
  - **冪等**建立 admin：先查該 email 是否已存在；不存在才 `POST ${SUPABASE_URL}/auth/v1/admin/users`，帶 `email_confirm: true`。已存在則略過（或更新密碼）並印出訊息。
  - admin email 必須與 `ADMIN_EMAIL_ALLOWLIST` 相符（後台白名單）。
  - 缺必要 env 時清楚報錯並 `exit 1`（比照現有 seed 腳本）。
- 在 `package.json` 加 `"seed:admin": "node scripts/seed-admin.mjs"`。

> 為何用 node admin API 而非把 user 寫進 `seed.sql`：直接 INSERT `auth.users` 需手動處理 bcrypt 密碼雜湊與 `auth.identities`，且欄位會隨 Supabase 版本變動而脆弱。GoTrue admin API 由 Supabase 維護，跨版本穩定。

#### A2.2 `pnpm db:reset`（新增包裝）

- 新增 `scripts/db-reset.mjs`（或直接用 package script 串接），依序執行：
  1. `supabase db reset`（套用所有 migration + 跑 `seed.sql`）
  2. `pnpm seed:admin`
  3. `pnpm seed:covers`
- 在 `package.json` 加 `"db:reset": "node scripts/db-reset.mjs"`。
- 任一步失敗即中止並回傳非零 exit code。
- 結果：一行指令把 schema + admin 帳號 + covers 真資料全部重建到一致狀態，新機器不必手點 Studio。

> 這保留了使用者「db reset 就自動把帳號弄好」的心智模型；因 `supabase db reset` 本身只跑 SQL、無法掛 node hook，故用同名包裝達成同樣的一鍵體驗，且比手刻 auth SQL 穩健。

#### A2.3 修掉懸空的 `seed.sql`

- 新增 `supabase/seed.sql`，內容為註解：說明 auth 帳號與 covers 改由 `pnpm db:reset`（`seed:admin` + `seed:covers`）處理，此檔刻意留空。
- 消除 `supabase db reset` 找不到 `seed.sql` 的警告，同時文件化意圖。

#### A2.4 `.env.local.example` 可直接複製

- 把本機 Supabase 的固定值填入 `.env.local.example`：
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`：填本機固定 key。
  - `ADMIN_EMAIL_ALLOWLIST=junwangwrk@gmail.com`
  - `E2E_ADMIN_EMAIL=junwangwrk@gmail.com`
  - `E2E_ADMIN_PASSWORD=<一組本機用的預設值>`（註明：本機開發/測試專用、可重建的拋棄式密碼，非正式 secret）。
- **實作時須驗證**：在本機跑 `supabase status`，確認 anon/secret key 是否每台機器都一致（CLI 2.x 預期為固定本機預設值）。
  - 若一致 → `.env.local.example` 直接內含 keys，新機器 `cp` 即可用。
  - 若不一致 → `.env.local.example` 對該兩個 key 維持 placeholder，README 指示從 `supabase status` 複製。

### A3 — 改寫 README 「第一次起動」

新流程取代手動建 admin 的段落：

```bash
# 前置：Node 20+、pnpm、OrbStack（或 Docker）、Supabase CLI
git clone <repo>
cd jun-website
pnpm install
cp .env.local.example .env.local      # 視 A2.4 結論，可能需補 keys
supabase start                          # OrbStack/Docker 需執行中
pnpm db:reset                           # 套 migration + 建 admin + 灌 covers
pnpm dev                                # http://localhost:3000
```

- 「常用指令」表加入 `pnpm db:reset`、`pnpm seed:admin`。
- 拿掉「到 Studio → Add user」那段（已被 `pnpm db:reset` 取代）。

### A4 — 不做（延後到 Phase B，獨立 spec）

VPS 自架正式站 + 自架 DB，包含：`docker-compose` 自架整套 Supabase、給 Next.js 的 Dockerfile、反向代理 + TLS、備份策略、用 `supabase db push` 把 migration 推到正式 DB。延後原因：需真實網域、機器規格、正式 secrets 才能定稿；VPS 尚未入手，現在做會做白工。目前架構（env 驅動 URL/keys）已足夠乾淨，Phase B 接上去只需換 env + 加 compose，本階段不需為它預先改動。

## 驗收標準

1. GitHub 上有 private repo，內容含 migrations、seed 腳本、`config.toml`、README，且無任何 secret。
2. 模擬乾淨狀態：`supabase db reset` 後直接 `pnpm db:reset`，能成功建立 admin 與 covers。
3. 用 `.env.local` 的 admin 帳密可登入 `/admin`；`/covers` 顯示種子資料。
4. `pnpm test` 與 `pnpm test:e2e` 通過。
5. README 的「第一次起動」步驟照著走可在零手動 Studio 操作下跑起來。

## 風險與緩解

- **本機 keys 可能非確定性** → A2.4 已含驗證步驟與 fallback（placeholder + 從 `supabase status` 複製）。
- **GoTrue admin endpoint 路徑/欄位** → 實作時對照本機 `supabase status` 與實際 API 行為驗證；冪等查存在再建立，避免重跑出錯。
- **`E2E_ADMIN_PASSWORD` 放進 example** → 僅本機拋棄式帳號、非正式環境 secret，並在 example 註明。

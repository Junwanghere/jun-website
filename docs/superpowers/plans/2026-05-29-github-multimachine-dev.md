# GitHub Private Repo + 多機本機開發可重現 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把專案推上 GitHub private repo,並讓任何一台新電腦都能用 `pnpm db:reset` 一鍵重現整個本機開發環境(schema + admin 帳號 + covers 種子資料)。

**Architecture:** 沿用既有的 Supabase CLI 工作流(Docker 由 CLI 自動管理,不寫 Dockerfile)。新增兩支 node 腳本:`seed-admin.mjs`(冪等建立 admin)與 `db-reset.mjs`(串接 `supabase db reset` → seed admin → seed covers)。修補懸空的 `seed.sql`、補齊 `.env.local.example`、改寫 README 起動流程,最後建立 GitHub private repo 並推送。

**Tech Stack:** Next.js 16 / Supabase CLI 2.101 / node (ESM `.mjs` scripts, raw `fetch` → GoTrue + PostgREST) / pnpm / gh CLI。

---

## File Structure

- `scripts/seed-admin.mjs` — **新增**。冪等建立本機 admin 帳號(GoTrue admin API)。
- `scripts/db-reset.mjs` — **新增**。一鍵重建:`supabase db reset` → `seed:admin` → `seed:covers`。
- `supabase/seed.sql` — **新增**。註解用空檔,消除 `db reset` 的缺檔警告。
- `package.json` — **修改**。新增 `seed:admin`、`db:reset` 兩個 script。
- `.env.local.example` — **修改**。填入本機固定值,讓新機器 `cp` 即可用。
- `README.md` — **修改**。改寫「第一次起動」與「常用指令」。
- GitHub private repo — **新增**。`gh repo create` + push。

每支腳本職責單一:`seed-admin` 只管帳號、`db-reset` 只做編排、`seed:covers` 維持原樣。

---

## Task 1: 前置驗證 — 本機環境與 keys 確定性

確認後續腳本與 `.env.local.example` 內容的事實依據。**這個 task 不改檔,只蒐集事實**;結果會決定 Task 5 怎麼填 keys。

**Files:** 無(純查證)。

- [ ] **Step 1: 確認 Supabase 本機已啟動**

Run: `supabase status`
Expected: 印出 `API URL: http://127.0.0.1:54321`、`anon key` / `publishable key`、`service_role key` / `secret key`、`Studio URL`。
若顯示未啟動,先 `supabase start`(需 OrbStack/Docker 執行中)再重跑。

- [ ] **Step 2: 記下本機三個值**

從上一步輸出記下:
- `NEXT_PUBLIC_SUPABASE_URL`(應為 `http://127.0.0.1:54321`)
- anon/publishable key(對應 `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- service_role/secret key(對應 `SUPABASE_SERVICE_ROLE_KEY`)

- [ ] **Step 3: 判定 keys 是否為固定本機預設值**

把 Step 2 的 anon key 與 service key,跟「另一個全新 Supabase CLI 專案」的預設值比較。最快做法:
Run: `supabase status -o env 2>/dev/null | grep -E 'ANON_KEY|SERVICE_ROLE_KEY|PUBLISHABLE|SECRET'`
判斷:CLI 2.x 的本機 key 預期是固定的(每台機器一致,來自固定的本機 demo 設定)。
- 若確認固定 → Task 5 直接把 keys 寫進 `.env.local.example`。
- 若不確定/可能每台不同 → Task 5 對這兩個 key 維持 placeholder,README 指示從 `supabase status` 複製。

記錄結論(固定 / 非固定),供 Task 5 使用。

- [ ] **Step 4: 確認 GoTrue admin endpoint 可用**

Run(把 `<SERVICE_ROLE>` 換成 Step 2 的 service key):
```bash
curl -s -X GET 'http://127.0.0.1:54321/auth/v1/admin/users' \
  -H "apikey: <SERVICE_ROLE>" -H "Authorization: Bearer <SERVICE_ROLE>" | head -c 300
```
Expected: 回傳 JSON,形如 `{"users":[...],"aud":...}`(可能 `users` 為空陣列)。這證實 `GET /auth/v1/admin/users` 可列出使用者、供 Task 2 做冪等判斷。

無對應 commit(純查證)。

---

## Task 2: 新增 `scripts/seed-admin.mjs`(冪等建立 admin)

**Files:**
- Create: `scripts/seed-admin.mjs`

- [ ] **Step 1: 手動冒煙測試「建立」路徑(先確認 endpoint 行為)**

先確保目前本機沒有該帳號(若 Studio 之前建過,先到 Studio 刪掉,或直接進行——腳本會冪等處理)。
這一步只是為了在寫腳本前親眼確認 POST 行為:
```bash
curl -s -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
  -H "apikey: <SERVICE_ROLE>" -H "Authorization: Bearer <SERVICE_ROLE>" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-test@example.com","password":"smoke-test-pw-123","email_confirm":true}' | head -c 300
```
Expected: 回傳含 `"id"`、`"email":"smoke-test@example.com"`、`"email_confirmed_at"` 非 null 的 JSON。
清掉測試帳號:
```bash
# 從上一步回傳取得 id,替換 <ID>
curl -s -X DELETE 'http://127.0.0.1:54321/auth/v1/admin/users/<ID>' \
  -H "apikey: <SERVICE_ROLE>" -H "Authorization: Bearer <SERVICE_ROLE>"
```

- [ ] **Step 2: 寫 `scripts/seed-admin.mjs`**

沿用 `scripts/seed-youtube-covers.mjs` 的 env loader 與 fetch 風格。

```javascript
#!/usr/bin/env node
/**
 * 在本機 Supabase 冪等建立 admin 帳號。
 *
 * 用 raw fetch 打 GoTrue admin API（跟 seed-youtube-covers.mjs 同一個模式，
 * 避免在 Node 起 supabase-js 的 Realtime WebSocket）。
 *
 * 行為：先 GET /auth/v1/admin/users 找該 email；不存在才 POST 建立
 * （email_confirm: true，本機 enable_confirmations=false 也能直接登入）。
 * 已存在則略過。帳密取自 .env.local 的 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD，
 * email 必須與 ADMIN_EMAIL_ALLOWLIST 相符（後台白名單）。
 *
 * 用法：
 *   pnpm seed:admin
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

// 從 .env.local 取連線設定（手寫 parser，避免拉 dotenv 之類的依賴）
function loadEnvLocal() {
  const raw = readFileSync(resolve(REPO_ROOT, '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const env = loadEnvLocal()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = env.E2E_ADMIN_EMAIL
const PASSWORD = env.E2E_ADMIN_PASSWORD

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
if (!EMAIL || !PASSWORD) {
  console.error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD in .env.local')
  process.exit(1)
}

const HEADERS = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

async function adminReq(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function main() {
  // 1. 找該 email 是否已存在（GoTrue admin list 支援 filter）
  const list = await adminReq('GET', `admin/users?filter=${encodeURIComponent(EMAIL)}`)
  const existing = (list.users ?? []).find((u) => u.email === EMAIL)

  if (existing) {
    console.log(`Admin already exists: ${EMAIL} (id=${existing.id}) — skipping.`)
    return
  }

  // 2. 不存在 → 建立（email_confirm 讓帳號可直接登入）
  const created = await adminReq('POST', 'admin/users', {
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  console.log(`Created admin: ${created.email} (id=${created.id})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

> 註:`admin/users?filter=` 的 filter 是子字串比對,故用 `.find((u) => u.email === EMAIL)` 精確比對。若 Task 1 Step 4 發現此版本 GoTrue 不吃 `filter` 參數,改成 `adminReq('GET', 'admin/users?per_page=200')` 再 `.find()`。

- [ ] **Step 3: 確認 `.env.local` 目前有所需四個變數**

Run: `grep -E 'NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|E2E_ADMIN_EMAIL|E2E_ADMIN_PASSWORD' .env.local`
Expected: 四個 key 都印出且有值(這份 `.env.local` 已存在於開發機)。
若缺,先補齊再繼續。

- [ ] **Step 4: 加 package.json script 並執行(建立路徑)**

先在 `package.json` 的 `scripts` 加一行(緊接 `seed:covers` 之後):
```json
    "seed:covers": "node scripts/seed-youtube-covers.mjs",
    "seed:admin": "node scripts/seed-admin.mjs"
```
Run: `pnpm seed:admin`
Expected: 印出 `Created admin: junwangwrk@gmail.com (id=...)`(若該帳號早已存在則印 `Admin already exists ... skipping.`)。

- [ ] **Step 5: 再跑一次,驗證冪等**

Run: `pnpm seed:admin`
Expected: 這次印出 `Admin already exists: junwangwrk@gmail.com (id=...) — skipping.`,且 exit code 0(無錯誤)。

- [ ] **Step 6: 驗證能登入**

Run: `pnpm test:e2e -- e2e --grep -i login` (若有 login 相關 e2e;否則手動)
或手動:`pnpm dev` 後到 `http://localhost:3000/login` 用 `.env.local` 的帳密登入,應成功進 `/admin`。
Expected: 登入成功。

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-admin.mjs package.json
git commit -m "feat(scripts): idempotent admin user seeder for local dev"
```

---

## Task 3: 新增 `scripts/db-reset.mjs`(一鍵重建)

**Files:**
- Create: `scripts/db-reset.mjs`

- [ ] **Step 1: 寫 `scripts/db-reset.mjs`**

```javascript
#!/usr/bin/env node
/**
 * 一鍵把本機 Supabase 重建到一致狀態：
 *   1. supabase db reset  → 套用所有 migration + 跑 supabase/seed.sql
 *   2. pnpm seed:admin    → 冪等建立 admin 帳號
 *   3. pnpm seed:covers   → 灌入 20 首真資料
 *
 * 任一步失敗即中止並回傳非零 exit code。
 *
 * 用法：
 *   pnpm db:reset
 */
import { spawnSync } from 'node:child_process'

const steps = [
  { label: 'supabase db reset', cmd: 'supabase', args: ['db', 'reset'] },
  { label: 'seed admin', cmd: 'pnpm', args: ['seed:admin'] },
  { label: 'seed covers', cmd: 'pnpm', args: ['seed:covers'] },
]

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`)
  const r = spawnSync(step.cmd, step.args, { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error(`\n✗ Step failed: ${step.label} (exit ${r.status ?? 'null'})`)
    process.exit(r.status ?? 1)
  }
}

console.log('\n✓ db:reset complete — schema + admin + covers all rebuilt.')
```

- [ ] **Step 2: 加 package.json script**

在 `package.json` 的 `scripts` 加(緊接 `seed:admin` 之後):
```json
    "seed:admin": "node scripts/seed-admin.mjs",
    "db:reset": "node scripts/db-reset.mjs"
```

- [ ] **Step 3: 執行,驗證三步全綠**

Run: `pnpm db:reset`
Expected: 依序印出三個 `=== ... ===` 區塊,`supabase db reset` 套用 4 個 migration,seed admin 建立或略過,seed covers 印 `Done. Seeded 20 covers.`,最後印 `✓ db:reset complete`。exit code 0。

> 注意:`supabase db reset` 會清掉 auth users,所以執行順序必須是 reset 先、seed:admin 後(本腳本已是此順序)。

- [ ] **Step 4: 驗證重建後狀態正確**

Run: `pnpm dev` 後開 `http://localhost:3000/covers`
Expected: 看到 20 首翻唱;用 `.env.local` 帳密可登入 `/admin`。

- [ ] **Step 5: Commit**

```bash
git add scripts/db-reset.mjs package.json
git commit -m "feat(scripts): one-command db:reset (reset + seed admin + seed covers)"
```

---

## Task 4: 修掉懸空的 `supabase/seed.sql`

`config.toml` 的 `[db.seed]` 指向 `./seed.sql` 但檔案不存在,`supabase db reset` 會略過/警告。建立一個註解用空檔。

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: 建立 `supabase/seed.sql`**

```sql
-- 此專案的種子資料刻意不放在這裡。
--
-- auth admin 帳號 與 covers 真資料 都由 `pnpm db:reset` 處理：
--   supabase db reset → pnpm seed:admin → pnpm seed:covers
--
-- 原因：auth.users 直接用 SQL 插入需手刻 bcrypt 密碼與 auth.identities，
-- 且欄位隨 Supabase 版本變動而脆弱；改用 GoTrue admin API（seed-admin.mjs）較穩健。
-- covers 的真實來源是 scripts/youtube-covers.json，由 seed-youtube-covers.mjs 灌入。
--
-- 本檔僅為滿足 config.toml 的 [db.seed].sql_paths = ["./seed.sql"]，避免 db reset 警告。
```

- [ ] **Step 2: 驗證 `db reset` 不再警告缺檔**

Run: `supabase db reset`
Expected: migration 套用成功,**不再**出現找不到 `seed.sql` 的警告/錯誤。
(reset 會清掉 admin,接著跑 `pnpm seed:admin && pnpm seed:covers` 或直接 `pnpm db:reset` 還原。)

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore(supabase): add documented no-op seed.sql to satisfy config"
```

---

## Task 5: 補齊 `.env.local.example`

讓新機器 `cp .env.local.example .env.local` 後盡量即可用。內容依 Task 1 Step 3 的結論決定 keys 是寫死還是 placeholder。

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: 依 Task 1 結論改寫 `.env.local.example`**

**情況 A — Task 1 判定本機 keys 為固定值**(把 `<...>` 換成 Task 1 Step 2 記下的真實本機 key):
```bash
# 本機 Supabase（supabase start 後的固定預設值；換機器後值相同，可直接沿用）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<本機 publishable/anon key>
SUPABASE_SERVICE_ROLE_KEY=<本機 secret/service_role key>

# 後台白名單（可登入 /admin 的 email）
ADMIN_EMAIL_ALLOWLIST=junwangwrk@gmail.com

# 本機 admin / E2E 帳號（由 `pnpm seed:admin` 建立）
# 注意：這是本機開發/測試專用、隨 db:reset 可重建的拋棄式帳號，非正式環境 secret。
E2E_ADMIN_EMAIL=junwangwrk@gmail.com
E2E_ADMIN_PASSWORD=local-dev-admin-pw
```

**情況 B — Task 1 判定 keys 可能每台不同**:把上面兩個 key 行改回 placeholder:
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=<從 `supabase status` 的 anon/publishable key 複製>
SUPABASE_SERVICE_ROLE_KEY=<從 `supabase status` 的 service_role/secret key 複製>
```
其餘(URL、allowlist、admin email/password)同情況 A。

- [ ] **Step 2: 同步開發機的 `.env.local` 密碼與 example 一致**

把 `.env.local` 的 `E2E_ADMIN_PASSWORD` 改成與 example 相同的值(`local-dev-admin-pw`),確保 `seed:admin` 建立的帳號、example、實際登入三者一致。
Run: `pnpm db:reset` 重建,使新密碼生效。
Expected: `✓ db:reset complete`。

- [ ] **Step 3: 模擬新機器驗證**

```bash
cp .env.local.example /tmp/env-check && diff <(sed -E 's/=.*//' .env.local | sort) <(sed -E 's/=.*//' /tmp/env-check | sort)
```
Expected: 兩邊的「變數名稱集合」一致(值可不同)。確認 example 沒漏掉任何 `.env.local` 用到的變數。

- [ ] **Step 4: 確認 `.env.local` 仍未被追蹤**

Run: `git status --porcelain .env.local`
Expected: 無輸出(`.env.local` 被 `.gitignore` 忽略,不會誤入版控)。

- [ ] **Step 5: Commit**

```bash
git add .env.local.example
git commit -m "chore(env): fill .env.local.example for one-step machine setup"
```

---

## Task 6: 改寫 README 的起動流程

**Files:**
- Modify: `README.md`(「第一次起動」段落 `:16-34`、「常用指令」表 `:45-54`)

- [ ] **Step 1: 替換「第一次起動」整段**

把 README 中從 `## 第一次起動` 到該段 ```` ```bash ... ``` ```` + Studio 建帳號說明 + `pnpm dev` 區塊(原 16–34 行),整段換成:

````markdown
## 第一次起動

任何一台新電腦,照以下步驟即可重現完整本機環境:

```bash
git clone <repo-url>
cd jun-website
pnpm install
cp .env.local.example .env.local   # 如該檔的 key 為 placeholder，依註解從 `supabase status` 補上
supabase start                      # 啟動本機 Supabase（OrbStack/Docker 需執行中）
pnpm db:reset                       # 套用 migration + 建 admin 帳號 + 灌入 covers 真資料
pnpm dev                            # http://localhost:3000
```

`pnpm db:reset` 會自動建立 admin 帳號(帳密取自 `.env.local` 的 `E2E_ADMIN_EMAIL` /
`E2E_ADMIN_PASSWORD`,需與 `ADMIN_EMAIL_ALLOWLIST` 相符),**不需要再手動到 Studio 建帳號**。
之後要把資料庫重置回乾淨一致狀態,隨時再跑一次 `pnpm db:reset` 即可。
````

- [ ] **Step 2: 更新「常用指令」表**

在「常用指令」表(原 47–54 行)加入兩列(放在 `supabase db reset` 那列附近):
```markdown
| `pnpm db:reset`                    | 重置 DB：套 migration + 建 admin + 灌 covers（一鍵還原一致狀態）     |
| `pnpm seed:admin`                  | 冪等建立本機 admin 帳號                                              |
```

- [ ] **Step 3: 驗證 README 內部一致**

Run: `grep -n "Studio.*Add user\|到 Studio" README.md`
Expected: 無輸出(舊的手動建帳號說明已被移除)。

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): one-command setup flow (pnpm db:reset), drop manual admin step"
```

---

## Task 7: 完整乾淨流程驗收(仿新機器)

在推上 GitHub 前,驗證整個重現流程真的可行。

**Files:** 無(驗收)。

- [ ] **Step 1: 從乾淨狀態重建**

```bash
supabase stop
supabase start
pnpm db:reset
```
Expected: 三步全綠,`✓ db:reset complete`。

- [ ] **Step 2: 跑全部測試**

Run: `pnpm test`
Expected: 全綠。

Run: `pnpm test:e2e`
Expected: Playwright 全綠,結束後自動 `pnpm seed:covers` 還原真資料(見 `scripts/test-e2e.mjs`)。

- [ ] **Step 3: 手動確認前後台**

`pnpm dev` →
- `http://localhost:3000/covers` 看到 20 首。
- `http://localhost:3000/login` 用 `.env.local` 帳密登入成功進 `/admin`。

無 commit(此 task 純驗收;若發現問題,回對應 task 修正)。

---

## Task 8: 建立 GitHub private repo 並推送

**Files:** 無(git/gh 操作)。

- [ ] **Step 1: 確認 gh 已登入**

Run: `gh auth status`
Expected: 顯示已登入 GitHub 帳號。若未登入,提示使用者執行 `! gh auth login`(互動式登入需由使用者在 session 內以 `!` 執行)。

- [ ] **Step 2: 提交目前未提交的 landing page 改動**

當前工作區有 landing page 個人照片與 `app/page.tsx` 的改動尚未提交。先確認內容:
Run: `git status --short`
Expected: 看到 `app/page.tsx`(M)與 `public/jun-profile.jpg`(??)等。
提交:
```bash
git add app/page.tsx public/jun-profile.jpg
git commit -m "feat(home): use childhood photo as landing page avatar"
```
(若 `git status` 另含本計畫各 task 已提交以外的其他改動,逐一確認後再提交。)

- [ ] **Step 3: 最終 secrets 掃描(推之前最後防線)**

Run: `git ls-files | grep -iE '\.env($|\.)' ; git grep -nI 'sb_secret_\|service_role' -- ':!*.example' ':!docs/*' || true`
Expected: 第一段只應出現 `.env.local.example`;第二段不應出現任何把真實 secret 寫進被追蹤檔的情形。若出現意外結果,停下處理後再推。

- [ ] **Step 4: 建立 private repo 並推送**

Run:
```bash
gh repo create jun-website --private --source=. --remote=origin --push
```
Expected: 建立 `<user>/jun-website`(private),設定 `origin`,並推送當前分支。

- [ ] **Step 5: 推送 main 與目前分支,確認 remote**

```bash
git push -u origin main 2>/dev/null || echo "main 尚未存在於本地或已推送"
git push -u origin HEAD
git remote -v
gh repo view --json visibility,nameWithOwner
```
Expected: `origin` 指向 GitHub;`visibility` 為 `PRIVATE`;分支已在遠端。

- [ ] **Step 6: 終極驗證 — 真的能從零 clone 起動(可選但建議)**

```bash
cd /tmp && git clone <origin-url> jun-website-verify && cd jun-website-verify
pnpm install
cp .env.local.example .env.local   # 視情況補 keys
supabase start && pnpm db:reset && pnpm dev
```
Expected: 照 README 流程能跑起來、`/covers` 有資料、可登入。驗證後刪除 `/tmp/jun-website-verify`。

無額外 commit(repo 已建立並推送)。

---

## Self-Review

**Spec coverage:**
- A1 上 GitHub → Task 8(+ Task 8 Step 2 提交未提交改動、Step 3 secrets 掃描)。✓
- A2.1 `seed:admin` → Task 2。✓
- A2.2 `db:reset` → Task 3。✓
- A2.3 修 `seed.sql` → Task 4。✓
- A2.4 `.env.local.example` + keys 確定性驗證 → Task 1(查證)+ Task 5(填寫,含 A/B 兩情況)。✓
- A3 README → Task 6。✓
- 驗收標準(登入、covers、`pnpm test`/`test:e2e`、乾淨流程)→ Task 7;clone 驗證 → Task 8 Step 6。✓
- A4 不做(VPS/Phase B)→ 計畫未含,正確。✓

**Placeholder scan:** 計畫內 `<SERVICE_ROLE>`、`<repo-url>`、`<本機 ... key>`、`<ID>` 皆為執行時填入的真實值占位,已明確標示來源(Task 1 記下的值 / `supabase status` / `gh repo` 輸出),非 TODO 性質的未定內容。情況 A/B 分支已給出完整兩套內容,非「之後再說」。

**Type/name consistency:** script 名稱 `seed:admin` / `db:reset` 與檔名 `seed-admin.mjs` / `db-reset.mjs` 跨 Task 一致;env 變數名(`E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`/`ADMIN_EMAIL_ALLOWLIST`/`SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`)跨 Task 2/5/6 一致;`db-reset.mjs` 呼叫的 `pnpm seed:admin`/`pnpm seed:covers` 對應 Task 2/既有 script。一致。

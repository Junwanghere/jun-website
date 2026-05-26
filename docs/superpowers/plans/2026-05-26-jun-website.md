# Jun Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個 Next.js 全端個人網站的基礎建設，並在其上實作翻唱列表功能（含公開頁面與後台 CRUD）。

**Architecture:** Next.js（App Router）全端 app，公開頁採 Server Components；後端為本機 Supabase（Postgres ＋ Auth ＋ Storage），透過 OrbStack 提供 Docker 相容環境；UI 以 shadcn/ui ＋ Tailwind 為基底，按莫蘭迪色系客製化；表單以 React Hook Form ＋ Zod；測試走 TDD，Vitest 做單元／元件，Playwright 做 E2E。

**Tech Stack:** Next.js 15+、TypeScript、Tailwind CSS v4、shadcn/ui、Radix UI、@supabase/ssr、Supabase CLI、OrbStack、React Hook Form、Zod、Vitest、@testing-library/react、Playwright

**Spec:** `docs/superpowers/specs/2026-05-26-jun-website-design.md`

---

## File Structure

```
jun-website/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .prettierrc
├── components.json                    # shadcn config
├── vitest.config.ts
├── playwright.config.ts
├── middleware.ts                      # /admin 保護
├── .env.local.example
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 0001_init_covers.sql       # covers + cover_links + RLS
│       └── 0002_storage_thumbnails.sql
├── app/
│   ├── layout.tsx                     # 根 layout：字體、主題、html lang=zh-Hant
│   ├── globals.css                    # Tailwind + Morandi @theme tokens
│   ├── page.tsx                       # 首頁（portal）
│   ├── covers/
│   │   ├── page.tsx                   # 公開列表（server component）
│   │   └── [id]/page.tsx              # 詳情頁
│   ├── login/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                 # 後台 shell
│   │   ├── page.tsx                   # dashboard
│   │   └── covers/
│   │       ├── page.tsx               # 後台列表
│   │       ├── new/page.tsx
│   │       └── [id]/edit/page.tsx
│   └── api/covers/load-more/route.ts  # load-more 端點
├── components/
│   ├── ui/                            # shadcn 元件（複製到 repo）
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   ├── portal-card.tsx
│   ├── social-button.tsx
│   ├── cover-card.tsx
│   ├── search-input.tsx
│   ├── filter-pills.tsx
│   ├── load-more-button.tsx
│   └── admin/
│       ├── cover-form.tsx
│       ├── platform-link-fields.tsx
│       └── thumbnail-upload.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                  # createServerClient
│   │   ├── client.ts                  # createBrowserClient
│   │   └── middleware.ts              # session 更新
│   ├── covers/
│   │   ├── types.ts
│   │   ├── search-params.ts           # URL params 解析
│   │   ├── queries.ts                 # 伺服器端查詢
│   │   └── schema.ts                  # Zod 表單 schema
│   ├── youtube.ts                     # 解析 video id、產生縮圖網址
│   ├── env.ts                         # 環境變數讀取與驗證
│   └── utils.ts                       # cn helper
├── tests/
│   └── lib/
│       ├── search-params.test.ts
│       ├── youtube.test.ts
│       └── cover-schema.test.ts
└── e2e/
    ├── covers.spec.ts
    └── admin.spec.ts
```

每個檔案的職責都集中、彼此邊界清楚：`lib/` 放純邏輯（可單元測試），`components/` 放 UI，`app/` 只負責路由與組裝。

---

# Phase 0 — 地基

完成本階段時的可驗證狀態：執行 `pnpm dev` 能跑起來、首頁是莫蘭迪傳送門版型、可亮暗切換、`pnpm test` 與 `pnpm test:e2e` 全綠、能用 email/密碼登入空的 `/admin`、`supabase status` 顯示本機堆疊在跑。

## Group A — 專案 bootstrap

### Task 1: 用 create-next-app 初始化專案

**Files:**
- Create: 整個專案結構

- [ ] **Step 1: 在 `/Users/junwang/Desktop/projects/jun-website/` 執行 create-next-app**

由於目錄已有 `docs/` 與 `.gitignore`，要用 `--use-pnpm`（或 npm）並選擇現有目錄。先把現有檔案暫時移開避免衝突：

```bash
cd /Users/junwang/Desktop/projects/jun-website
mkdir -p .keep-tmp && mv docs .gitignore .keep-tmp/
pnpm dlx create-next-app@latest . \
  --typescript --tailwind --app --src-dir=false \
  --eslint --import-alias '@/*' --no-turbopack --use-pnpm
```

若 create-next-app 跳出檔案存在的提示，選擇 yes 覆蓋（會覆蓋的只有它要產生的初始檔）。

- [ ] **Step 2: 還原 docs 與 .gitignore，合併 .gitignore**

```bash
mv .keep-tmp/docs ./docs
# 合併：把舊 .gitignore 的內容附加到 create-next-app 產的 .gitignore 後面（先看內容）
cat .keep-tmp/.gitignore >> .gitignore
rm -rf .keep-tmp
```

打開 `.gitignore`，手動去除重複行；確認以下項目都存在：`/node_modules`、`/.next/`、`.env*.local`、`.superpowers/`、`/coverage`、`/test-results`、`/playwright-report`。

- [ ] **Step 3: 驗證 dev server 起得來**

```bash
pnpm dev
```

預期：終端機顯示 `http://localhost:3000`，瀏覽器打開看到 Next.js 預設首頁。按 Ctrl-C 停掉。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TS + Tailwind"
```

---

### Task 2: 設定 Prettier 與額外 ESLint 規則

**Files:**
- Create: `.prettierrc`
- Modify: `package.json`（加 lint:format script）

- [ ] **Step 1: 建立 `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 2: 安裝 prettier**

```bash
pnpm add -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 3: 在 `package.json` 的 `scripts` 加入**

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 4: 跑一次 format**

```bash
pnpm format
pnpm lint
```

預期：兩個都跑完無錯誤。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add prettier + tailwind plugin"
```

---

### Task 3: 安裝設定 Vitest（單元／元件測試）

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: 安裝依賴**

```bash
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: 建立 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

```bash
pnpm add -D @vitejs/plugin-react
```

- [ ] **Step 3: 建立 `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: 在 `package.json` 的 `scripts` 加**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 寫一個 smoke test 確認 vitest 跑得動**

建立 `tests/smoke.test.ts`：

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('vitest 跑得起來', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: 跑測試確認通過**

```bash
pnpm test
```

預期：1 passed。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: setup vitest + RTL"
```

---

### Task 4: 安裝設定 Playwright（E2E）

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: 安裝 Playwright**

```bash
pnpm dlx playwright install --with-deps
pnpm add -D @playwright/test
```

- [ ] **Step 2: 建立 `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

- [ ] **Step 3: 在 `package.json` 的 `scripts` 加**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: 寫個 smoke E2E**

建立 `e2e/smoke.spec.ts`：

```ts
import { test, expect } from '@playwright/test'

test('首頁回 200 且有 html 標籤', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toBeVisible()
})
```

- [ ] **Step 5: 跑 E2E 確認通過**

```bash
pnpm test:e2e
```

預期：1 passed。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: setup playwright"
```

---

## Group B — shadcn/ui ＋ 設計 token

### Task 5: 初始化 shadcn/ui

**Files:**
- Create: `components.json`
- Create: `components/ui/*`（由 CLI 產生）

- [ ] **Step 1: 跑 shadcn init**

```bash
pnpm dlx shadcn@latest init
```

互動回答：
- TypeScript: yes
- Style: `Default`
- Base color: `Slate`（之後會覆寫成莫蘭迪）
- CSS variables: yes

- [ ] **Step 2: 加入第一批會用到的元件**

```bash
pnpm dlx shadcn@latest add button input label card form dialog alert-dialog dropdown-menu badge separator skeleton
```

- [ ] **Step 3: 驗證**

```bash
ls components/ui/
```

預期：看到 button.tsx、input.tsx、card.tsx 等檔案。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: init shadcn/ui + add core components"
```

---

### Task 6: 替換為莫蘭迪色 token、安裝字體

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 改寫 `app/globals.css` 為莫蘭迪 token**

完整覆蓋檔案內容：

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --font-mono: var(--font-mono);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 1rem;
  /* 莫蘭迪：亮模式 */
  --background: oklch(0.93 0.005 80);          /* #EAE8E3 淺暖灰 */
  --foreground: oklch(0.25 0.005 60);          /* #3A3835 近黑灰 */
  --card: oklch(0.96 0.004 80);                /* #F6F4F0 卡片底 */
  --card-foreground: oklch(0.25 0.005 60);
  --popover: oklch(0.96 0.004 80);
  --popover-foreground: oklch(0.25 0.005 60);
  --primary: oklch(0.55 0.015 235);            /* #737F84 霧藍灰 */
  --primary-foreground: oklch(0.96 0.004 80);
  --secondary: oklch(0.90 0.004 80);
  --secondary-foreground: oklch(0.35 0.005 60);
  --muted: oklch(0.90 0.004 80);
  --muted-foreground: oklch(0.58 0.005 60);    /* #8F8A83 */
  --accent: oklch(0.55 0.015 235);
  --accent-foreground: oklch(0.96 0.004 80);
  --destructive: oklch(0.55 0.12 25);
  --destructive-foreground: oklch(0.96 0.004 80);
  --border: oklch(0.85 0.005 80);
  --input: oklch(0.88 0.004 80);
  --ring: oklch(0.55 0.015 235);
}

.dark {
  /* 莫蘭迪：暗模式 */
  --background: oklch(0.20 0.005 60);
  --foreground: oklch(0.90 0.004 80);
  --card: oklch(0.24 0.005 60);
  --card-foreground: oklch(0.90 0.004 80);
  --popover: oklch(0.24 0.005 60);
  --popover-foreground: oklch(0.90 0.004 80);
  --primary: oklch(0.70 0.015 235);
  --primary-foreground: oklch(0.20 0.005 60);
  --secondary: oklch(0.30 0.005 60);
  --secondary-foreground: oklch(0.85 0.004 80);
  --muted: oklch(0.28 0.005 60);
  --muted-foreground: oklch(0.65 0.005 60);
  --accent: oklch(0.70 0.015 235);
  --accent-foreground: oklch(0.20 0.005 60);
  --destructive: oklch(0.65 0.12 25);
  --destructive-foreground: oklch(0.20 0.005 60);
  --border: oklch(0.32 0.005 60);
  --input: oklch(0.30 0.005 60);
  --ring: oklch(0.70 0.015 235);
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: 在 `app/layout.tsx` 設定字體**

完整覆蓋：

```tsx
import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoTC = Noto_Sans_TC({ subsets: ['latin'], variable: '--font-noto-tc' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-jb' })

export const metadata: Metadata = {
  title: '王嘉駿 · Jun Wang',
  description: '前端工程師 ／ 音樂人',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoTC.variable} ${mono.variable} antialiased`}
        style={{
          fontFamily: 'var(--font-inter), var(--font-noto-tc), system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 跑 dev 確認字體與顏色生效**

```bash
pnpm dev
```

打開 http://localhost:3000，背景應該變淺暖灰，字體看起來是 Inter／思源黑體。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(theme): morandi color tokens + fonts (Inter / Noto TC / JetBrains Mono)"
```

---

## Group C — 主題切換與根版型

### Task 7: 加入 dark mode 切換（next-themes）

**Files:**
- Create: `components/theme-provider.tsx`
- Create: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 安裝 next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: 建立 `components/theme-provider.tsx`**

```tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 3: 建立 `components/theme-toggle.tsx`**

```tsx
'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="size-9" />

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="切換亮暗模式"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
```

- [ ] **Step 4: 在 `app/layout.tsx` 包入 ThemeProvider**

在 `<body>` 內側包：

```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

並 `import { ThemeProvider } from '@/components/theme-provider'`。

- [ ] **Step 5: 在 `app/page.tsx` 暫時放 ThemeToggle 測試**

把 `app/page.tsx` 內容換成：

```tsx
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <ThemeToggle />
    </main>
  )
}
```

- [ ] **Step 6: 驗證**

`pnpm dev`，打開首頁，點切換鈕應該亮暗切換、背景顏色跟著變。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(theme): light/dark mode toggle via next-themes"
```

---

## Group D — 本機 Supabase（OrbStack）

### Task 8: 確認 OrbStack ＋ 安裝 Supabase CLI ＋ 初始化

**Files:**
- Create: `supabase/config.toml`（由 CLI 產生）

- [ ] **Step 1: 確認 OrbStack 已安裝並執行**

```bash
orb version
docker info
```

預期：`orb version` 顯示版本號；`docker info` 不噴錯（OrbStack 提供 docker socket）。
若沒裝：`brew install orbstack` 之後打開 OrbStack 一次。

- [ ] **Step 2: 安裝 Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase --version
```

- [ ] **Step 3: 初始化 Supabase 專案**

```bash
supabase init
```

預期：產生 `supabase/config.toml` 與 `supabase/.gitignore`。

- [ ] **Step 4: 啟動本機堆疊**

```bash
supabase start
```

預期：抓 image 後印出一段資訊，含 API URL（通常 `http://127.0.0.1:54321`）、anon key、service_role key、Studio URL（`http://127.0.0.1:54323`）。

打開 Studio URL 應該看到空的 schema。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(supabase): init local stack via supabase CLI"
```

---

### Task 9: 環境變數 ＋ Supabase clients

**Files:**
- Create: `.env.local.example`
- Create: `.env.local`（不進版控）
- Create: `lib/env.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 1: 安裝 @supabase/ssr**

```bash
pnpm add @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: 建立 `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<replace with `supabase start` 印出的 anon key>
ADMIN_EMAIL_ALLOWLIST=junwangwrk@gmail.com
```

- [ ] **Step 3: 建立 `.env.local`**

把實際的 anon key 從 `supabase status` 的輸出複製進來。

- [ ] **Step 4: 建立 `lib/env.ts`**

```ts
const required = (name: string): string => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const env = {
  SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
}

export const ADMIN_EMAILS = (process.env.ADMIN_EMAIL_ALLOWLIST ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
```

- [ ] **Step 5: 建立 `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // 在 Server Component 內呼叫 set 會丟錯，可忽略；session 會由 middleware refresh
        }
      },
    },
  })
}
```

- [ ] **Step 6: 建立 `lib/supabase/client.ts`**

```ts
'use client'
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function createClient() {
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
}
```

- [ ] **Step 7: 建立 `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  return { response, user }
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(supabase): server/browser/middleware clients + env validation"
```

---

## Group E — 資料庫 schema ＋ Storage

### Task 10: 第一支 migration：covers ＋ cover_links ＋ RLS

**Files:**
- Create: `supabase/migrations/0001_init_covers.sql`

- [ ] **Step 1: 用 CLI 產生空 migration 檔**

```bash
supabase migration new init_covers
```

預期：產生 `supabase/migrations/<timestamp>_init_covers.sql`。把時間戳改成 `0001` 以便閱讀順序：

```bash
mv supabase/migrations/*init_covers.sql supabase/migrations/0001_init_covers.sql
```

- [ ] **Step 2: 寫 migration 內容**

```sql
-- 翻唱主表
create table public.covers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_artist text not null,
  cover_date date not null,
  thumbnail_url text,
  description text,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 平台連結（一首對多筆）
create table public.cover_links (
  id uuid primary key default gen_random_uuid(),
  cover_id uuid not null references public.covers(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'threads', 'other')),
  platform_label text,
  url text not null
);

-- 索引
create index covers_cover_date_idx on public.covers (cover_date desc);
create index covers_tags_idx on public.covers using gin (tags);
create index cover_links_cover_id_idx on public.cover_links (cover_id);
create index cover_links_platform_idx on public.cover_links (platform);

-- 更新 updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger covers_set_updated_at
before update on public.covers
for each row execute function public.set_updated_at();

-- RLS
alter table public.covers enable row level security;
alter table public.cover_links enable row level security;

-- 任何人可讀
create policy "covers_select_all" on public.covers for select using (true);
create policy "cover_links_select_all" on public.cover_links for select using (true);

-- 已登入才能寫
create policy "covers_write_authenticated" on public.covers
  for all to authenticated using (true) with check (true);
create policy "cover_links_write_authenticated" on public.cover_links
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 3: 套用到本機 DB**

```bash
supabase db reset
```

預期：印出 reset 完成。打開 Studio (http://127.0.0.1:54323)，Tables 應該看到 `covers` 與 `cover_links`。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): init covers + cover_links tables + RLS policies"
```

---

### Task 11: Storage migration：cover-thumbnails bucket

**Files:**
- Create: `supabase/migrations/0002_storage_thumbnails.sql`

- [ ] **Step 1: 產生 migration 並命名**

```bash
supabase migration new storage_thumbnails
mv supabase/migrations/*storage_thumbnails.sql supabase/migrations/0002_storage_thumbnails.sql
```

- [ ] **Step 2: 寫 migration 內容**

```sql
-- 公開讀的縮圖 bucket
insert into storage.buckets (id, name, public)
values ('cover-thumbnails', 'cover-thumbnails', true)
on conflict (id) do nothing;

-- 已登入可上傳／更新／刪除
create policy "thumbnails_authenticated_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'cover-thumbnails')
  with check (bucket_id = 'cover-thumbnails');

-- 任何人可讀（bucket 本身已 public，但加 policy 保險）
create policy "thumbnails_public_read" on storage.objects
  for select to public
  using (bucket_id = 'cover-thumbnails');
```

- [ ] **Step 3: 套用**

```bash
supabase db reset
```

驗證：在 Studio Storage 分頁應該看到 `cover-thumbnails` bucket。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(db): storage bucket for cover thumbnails"
```

---

## Group F — Auth ＋ middleware

### Task 12: 建立 admin 帳號

**Files:** 無；只是建帳號

- [ ] **Step 1: 在 Studio 建立你的帳號**

打開 http://127.0.0.1:54323 → Authentication → Users → Add user → Create new user。輸入 email（要與 `.env.local` 的 `ADMIN_EMAIL_ALLOWLIST` 一致，例如 `junwangwrk@gmail.com`）與密碼，勾「Auto Confirm User」。

- [ ] **Step 2: 把建帳號的步驟也寫進 README（之後 Task 39 會做）**

暫時記下：`supabase db reset` 會清掉 auth users，所以每次 reset 後要重建帳號。之後可寫 seed 腳本，但本階段先手動。

---

### Task 13: 登入頁

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/login-form.tsx`

- [ ] **Step 1: 建立 server component `app/login/page.tsx`**

```tsx
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">登入後台</h1>
          <p className="text-sm text-muted-foreground">只有作者本人能進入</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 建立 client component `app/login/login-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密碼</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? '登入中⋯' : '登入'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: 跑 dev 手動驗證**

`pnpm dev`，到 http://localhost:3000/login，用 Task 12 建的帳號登入。成功會 redirect 去 `/admin`（雖然此時 `/admin` 還沒做），但 cookie 應該已寫入。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): login page with email + password"
```

---

### Task 14: middleware 保護 /admin

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: 建立 `middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { ADMIN_EMAILS } from '@/lib/env'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // 保護 /admin 路徑
  if (pathname.startsWith('/admin')) {
    const email = user?.email?.toLowerCase()
    if (!user || !email || !ADMIN_EMAILS.includes(email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: 暫時放一個 `/admin/page.tsx` 做驗證**

```tsx
// app/admin/page.tsx
export default function AdminHome() {
  return <main className="min-h-dvh flex items-center justify-center">已進入後台</main>
}
```

- [ ] **Step 3: 手動驗證**

開無痕視窗到 `/admin`，應該被導到 `/login`。登入後重新到 `/admin` 看到「已進入後台」。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): protect /admin with middleware + email allowlist"
```

---

## Group G — 首頁（傳送門）

### Task 15: PortalCard 元件 ＋ 元件測試

**Files:**
- Create: `components/portal-card.tsx`
- Create: `tests/components/portal-card.test.tsx`

- [ ] **Step 1: 寫失敗的測試**

`tests/components/portal-card.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PortalCard } from '@/components/portal-card'

describe('PortalCard', () => {
  it('顯示 label、title、description、且是連結到 href', () => {
    render(
      <PortalCard
        href="/covers"
        label="COVERS"
        title="127 首翻唱"
        description="最新：交換餘生"
      />,
    )
    const link = screen.getByRole('link', { name: /127 首翻唱/ })
    expect(link).toHaveAttribute('href', '/covers')
    expect(screen.getByText('COVERS')).toBeInTheDocument()
    expect(screen.getByText('最新：交換餘生')).toBeInTheDocument()
  })

  it('featured 變體顯示為實心主色背景', () => {
    render(<PortalCard href="/covers" label="X" title="Y" featured />)
    const link = screen.getByRole('link')
    expect(link.className).toMatch(/bg-primary/)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
pnpm test tests/components/portal-card.test.tsx
```

預期：FAIL（元件還沒寫）。

- [ ] **Step 3: 實作 `components/portal-card.tsx`**

```tsx
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label?: string
  title: string
  description?: string
  featured?: boolean
}

export function PortalCard({ href, label, title, description, featured }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl px-5 py-4 transition shadow-sm hover:shadow-md',
        featured
          ? 'bg-primary text-primary-foreground border-l-0'
          : 'bg-card text-card-foreground border-l-2 border-primary/70',
      )}
    >
      {label && (
        <div
          className={cn(
            'font-mono text-[10px] font-bold tracking-widest',
            featured ? 'opacity-90' : 'text-primary',
          )}
        >
          {label}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-base font-bold">{title}</span>
        <ArrowRight className="size-4 shrink-0 transition group-hover:translate-x-0.5" />
      </div>
      {description && (
        <div
          className={cn(
            'mt-0.5 text-xs',
            featured ? 'opacity-90' : 'text-muted-foreground',
          )}
        >
          {description}
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
pnpm test tests/components/portal-card.test.tsx
```

預期：2 passed。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(home): PortalCard component with tests"
```

---

### Task 16: SocialButton 元件

**Files:**
- Create: `components/social-button.tsx`

- [ ] **Step 1: 實作（無邏輯只是樣式包裝，跳過 TDD）**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

export function SocialButton({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full bg-card text-foreground shadow-sm hover:shadow transition"
    >
      {children}
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(home): SocialButton component"
```

---

### Task 17: 首頁組合

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 改寫 `app/page.tsx`**

```tsx
import { PortalCard } from '@/components/portal-card'
import { SocialButton } from '@/components/social-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Instagram, AtSign, Youtube } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <section className="text-center mt-2">
          <div
            aria-hidden
            className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-md"
          >
            駿
          </div>
          <h1 className="mt-3 text-xl font-bold">
            王嘉駿 <span className="text-primary">·</span> 小駿
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">前端工程師 ／ 音樂人</p>
          <p className="mt-2 text-sm text-muted-foreground/80">玩程式，也玩聲音。</p>

          <div className="mt-4 flex justify-center gap-2.5">
            <SocialButton href="https://instagram.com/juniswang" label="Instagram">
              <Instagram className="size-4" />
            </SocialButton>
            <SocialButton href="https://www.threads.net/@juniswang" label="Threads">
              <AtSign className="size-4" />
            </SocialButton>
            <SocialButton href="https://youtube.com" label="YouTube">
              <Youtube className="size-4" />
            </SocialButton>
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-3">
          <PortalCard
            href="/covers"
            label="COVERS"
            title="翻唱清單"
            description="點來聽我唱過的歌"
            featured
          />
          <PortalCard
            href="/writing"
            label="WRITING"
            title="文章 ／ 隨筆"
            description="技術筆記與生活雜記"
          />
          <PortalCard
            href="/work"
            label="WORK"
            title="作品集"
            description="音樂與網頁專案"
          />
          <PortalCard href="/about" label="ABOUT" title="關於我" description="我是誰、在做什麼" />
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground/70">© 2026 王嘉駿</footer>
      </div>
    </main>
  )
}
```

注意：`/writing`、`/work`、`/about` 路由本階段不存在，點下去會 404；之後階段再做。連結到 `/covers` 也還是 404，到 Phase 1 才會存在。

- [ ] **Step 2: 手動驗證**

`pnpm dev`，打開 http://localhost:3000，應看到莫蘭迪傳送門首頁，亮暗切換正常。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(home): portal-style homepage assembled"
```

---

### Task 18: Phase 0 收尾 — 整體驗證

**Files:** 無；只是執行驗證

- [ ] **Step 1: 全測試跑過**

```bash
pnpm test && pnpm test:e2e && pnpm lint && pnpm format:check
```

預期：全綠。

- [ ] **Step 2: 手動體驗清單**

打開 http://localhost:3000，依序確認：
- 首頁顯示傳送門版型，莫蘭迪色，字體正確
- 亮／暗切換鈕正常
- 連到 `/login` 能載入並登入
- 登入後 `/admin` 看得到「已進入後台」
- 登出（暫無 UI，先用 Studio Authentication 刪 session 或 incognito 重開）後 `/admin` 被導向 `/login`

- [ ] **Step 3: Tag Phase 0**

```bash
git tag phase-0-foundation
```

---

# Phase 1 — 翻唱功能

完成本階段時的可驗證狀態：`/covers` 顯示所有翻唱，可搜尋／篩選平台／載入更多；點進去看詳情頁（含 YouTube 內嵌）；登入後在 `/admin/covers` 可新增、編輯、刪除翻唱（含縮圖上傳、多平台連結、YouTube 連結自動帶縮圖）；新增完馬上能在公開頁看到。

## Group H — Covers 資料層

### Task 19: Cover 型別

**Files:**
- Create: `lib/covers/types.ts`

- [ ] **Step 1: 實作**

```ts
export const PLATFORMS = ['youtube', 'instagram', 'threads', 'other'] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  threads: 'Threads',
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
  platform?: Platform
  tag?: string
  sort: CoverSort
  limit: number
  offset: number
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(covers): cover types and platform constants"
```

---

### Task 20: URL 查詢參數解析（TDD）

**Files:**
- Create: `tests/lib/search-params.test.ts`
- Create: `lib/covers/search-params.ts`

- [ ] **Step 1: 寫失敗的測試**

```ts
import { describe, it, expect } from 'vitest'
import { parseSearchParams } from '@/lib/covers/search-params'

describe('parseSearchParams', () => {
  it('沒有參數時用預設值', () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      platform: undefined,
      tag: undefined,
      sort: 'newest',
      limit: 20,
      offset: 0,
    })
  })

  it('解析 q / platform / tag / sort', () => {
    expect(
      parseSearchParams({ q: '林宥嘉', platform: 'youtube', tag: '抒情', sort: 'oldest' }),
    ).toMatchObject({
      q: '林宥嘉',
      platform: 'youtube',
      tag: '抒情',
      sort: 'oldest',
    })
  })

  it('忽略不合法的 platform', () => {
    expect(parseSearchParams({ platform: 'spotify' }).platform).toBeUndefined()
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

- [ ] **Step 2: 跑確認失敗**

```bash
pnpm test tests/lib/search-params.test.ts
```

預期：FAIL（找不到模組）。

- [ ] **Step 3: 實作 `lib/covers/search-params.ts`**

```ts
import { PLATFORMS, type CoverQuery, type Platform, type CoverSort } from './types'

const DEFAULT_LIMIT = 20

function asPlatform(v: unknown): Platform | undefined {
  return typeof v === 'string' && (PLATFORMS as readonly string[]).includes(v)
    ? (v as Platform)
    : undefined
}

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
    platform: asPlatform(get('platform')),
    tag: get('tag') || undefined,
    sort: asSort(get('sort')),
    limit: DEFAULT_LIMIT,
    offset: asOffset(get('cursor')),
  }
}

export function buildQueryString(q: Partial<CoverQuery>): string {
  const sp = new URLSearchParams()
  if (q.q) sp.set('q', q.q)
  if (q.platform) sp.set('platform', q.platform)
  if (q.tag) sp.set('tag', q.tag)
  if (q.sort && q.sort !== 'newest') sp.set('sort', q.sort)
  if (q.offset) sp.set('cursor', String(q.offset))
  return sp.toString()
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
pnpm test tests/lib/search-params.test.ts
```

預期：5 passed。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(covers): URL search params parser + builder (with tests)"
```

---

### Task 21: 伺服器端查詢函式

**Files:**
- Create: `lib/covers/queries.ts`

注意：這個函式直接打 Supabase，單元測試會需要 mock client。為了不過度工程，這裡先用「實際打本機 Supabase」的整合測試在 E2E 時驗證；現在只寫實作，並在 E2E 涵蓋其行為。

- [ ] **Step 1: 實作 `lib/covers/queries.ts`**

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

  // 平台過濾用兩階段：先找有該平台連結的 cover id，再 in() 篩主表。
  // 這樣回來的 cover_links 仍包含該翻唱的所有平台連結（不只匹配的那個）。
  let coverIdsFilter: string[] | null = null
  if (query.platform) {
    const { data: ids, error: idErr } = await supabase
      .from('cover_links')
      .select('cover_id')
      .eq('platform', query.platform)
    if (idErr) throw idErr
    coverIdsFilter = Array.from(new Set((ids ?? []).map((r) => r.cover_id)))
    if (coverIdsFilter.length === 0) {
      return { items: [], total: 0, hasMore: false }
    }
  }

  let q = supabase
    .from('covers')
    .select('*, cover_links(*)', { count: 'exact' })
    .order('cover_date', { ascending: query.sort === 'oldest' })
    .range(query.offset, query.offset + query.limit - 1)

  if (coverIdsFilter) q = q.in('id', coverIdsFilter)

  if (query.q) {
    const escaped = query.q.replace(/[%_]/g, '\\$&')
    q = q.or(`title.ilike.%${escaped}%,original_artist.ilike.%${escaped}%`)
  }
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(covers): server-side list + getById queries"
```

---

### Task 22: YouTube 工具（TDD）

**Files:**
- Create: `tests/lib/youtube.test.ts`
- Create: `lib/youtube.ts`

- [ ] **Step 1: 寫失敗的測試**

```ts
import { describe, it, expect } from 'vitest'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'

describe('extractYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxxx',
      'dQw4w9WgXcQ',
    ],
  ])('解析 %s -> %s', (url, expected) => {
    expect(extractYouTubeId(url)).toBe(expected)
  })

  it('非 YouTube 連結回 null', () => {
    expect(extractYouTubeId('https://example.com')).toBeNull()
    expect(extractYouTubeId('not a url')).toBeNull()
  })
})

describe('youtubeThumbnail', () => {
  it('組合縮圖網址', () => {
    expect(youtubeThumbnail('abc123XYZ_-')).toBe(
      'https://img.youtube.com/vi/abc123XYZ_-/hqdefault.jpg',
    )
  })
})
```

- [ ] **Step 2: 跑確認失敗**

```bash
pnpm test tests/lib/youtube.test.ts
```

- [ ] **Step 3: 實作 `lib/youtube.ts`**

```ts
const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/

export function extractYouTubeId(input: string): string | null {
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      return YT_ID_RE.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v')
      if (v && YT_ID_RE.test(v)) return v
      const parts = url.pathname.split('/').filter(Boolean)
      // /embed/<id>、/shorts/<id>、/live/<id>
      if (parts.length >= 2 && ['embed', 'shorts', 'live'].includes(parts[0])) {
        return YT_ID_RE.test(parts[1]) ? parts[1] : null
      }
    }
    return null
  } catch {
    return null
  }
}

export function youtubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
pnpm test tests/lib/youtube.test.ts
```

預期：6+ passed。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(youtube): extract video id + derive thumbnail (with tests)"
```

---

### Task 23: Zod 表單 schema（TDD）

**Files:**
- Create: `tests/lib/cover-schema.test.ts`
- Create: `lib/covers/schema.ts`

- [ ] **Step 1: 安裝 zod**

```bash
pnpm add zod
```

- [ ] **Step 2: 寫失敗的測試**

```ts
import { describe, it, expect } from 'vitest'
import { coverFormSchema } from '@/lib/covers/schema'

describe('coverFormSchema', () => {
  const valid = {
    title: '交換餘生',
    original_artist: '林宥嘉',
    cover_date: '2026-05-01',
    description: null,
    tags: [],
    thumbnail_url: null,
    links: [{ platform: 'youtube', platform_label: null, url: 'https://youtu.be/dQw4w9WgXcQ' }],
  }

  it('合法資料通過', () => {
    expect(coverFormSchema.safeParse(valid).success).toBe(true)
  })

  it('title 不能為空', () => {
    const r = coverFormSchema.safeParse({ ...valid, title: '' })
    expect(r.success).toBe(false)
  })

  it('日期格式錯誤被拒', () => {
    expect(coverFormSchema.safeParse({ ...valid, cover_date: '2026/05/01' }).success).toBe(false)
  })

  it('連結網址必須是合法 URL', () => {
    expect(
      coverFormSchema.safeParse({
        ...valid,
        links: [{ platform: 'youtube', platform_label: null, url: 'not a url' }],
      }).success,
    ).toBe(false)
  })

  it('platform=other 時 platform_label 必填', () => {
    expect(
      coverFormSchema.safeParse({
        ...valid,
        links: [{ platform: 'other', platform_label: null, url: 'https://example.com' }],
      }).success,
    ).toBe(false)
    expect(
      coverFormSchema.safeParse({
        ...valid,
        links: [{ platform: 'other', platform_label: 'StreetVoice', url: 'https://example.com' }],
      }).success,
    ).toBe(true)
  })

  it('至少要有一筆連結', () => {
    expect(coverFormSchema.safeParse({ ...valid, links: [] }).success).toBe(false)
  })
})
```

- [ ] **Step 3: 跑確認失敗**

```bash
pnpm test tests/lib/cover-schema.test.ts
```

- [ ] **Step 4: 實作 `lib/covers/schema.ts`**

```ts
import { z } from 'zod'
import { PLATFORMS } from './types'

export const coverLinkSchema = z
  .object({
    platform: z.enum(PLATFORMS),
    platform_label: z.string().nullable(),
    url: z.string().url('請輸入合法網址'),
  })
  .superRefine((val, ctx) => {
    if (val.platform === 'other' && !val.platform_label?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['platform_label'],
        message: '選「其他」時請填平台名稱',
      })
    }
  })

export const coverFormSchema = z.object({
  title: z.string().min(1, '請填歌名').max(200),
  original_artist: z.string().min(1, '請填原唱').max(200),
  cover_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式須為 YYYY-MM-DD'),
  description: z.string().max(2000).nullable(),
  tags: z.array(z.string().min(1).max(50)).max(20),
  thumbnail_url: z.string().url().nullable(),
  links: z.array(coverLinkSchema).min(1, '至少要有一個平台連結'),
})

export type CoverFormValues = z.infer<typeof coverFormSchema>
```

- [ ] **Step 5: 跑測試確認通過**

```bash
pnpm test tests/lib/cover-schema.test.ts
```

預期：6 passed。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(covers): Zod form schema (with tests)"
```

---

## Group I — 公開翻唱列表

### Task 24: CoverCard 元件

**Files:**
- Create: `components/cover-card.tsx`

- [ ] **Step 1: 實作**

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PLATFORM_LABEL, type CoverWithLinks, type Platform } from '@/lib/covers/types'

const PLATFORM_SHORT: Record<Platform, string> = {
  youtube: 'YT',
  instagram: 'IG',
  threads: 'TH',
  other: '其他',
}

function platformPillClass(platform: Platform) {
  return cn(
    'rounded-full px-2 py-[2px] text-[10px] font-bold',
    platform === 'youtube'
      ? 'bg-primary/10 text-primary'
      : 'bg-muted text-muted-foreground',
  )
}

export function CoverCard({ cover }: { cover: CoverWithLinks }) {
  return (
    <Link
      href={`/covers/${cover.id}`}
      className="flex gap-3 rounded-2xl bg-card p-3 shadow-sm transition hover:shadow-md"
    >
      <div
        className="size-[60px] shrink-0 rounded-xl bg-muted"
        style={
          cover.thumbnail_url ? { background: `center/cover no-repeat url('${cover.thumbnail_url}')` } : undefined
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-card-foreground">{cover.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          原唱 {cover.original_artist} · {cover.cover_date}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {cover.cover_links.map((l) => (
            <span key={l.id} className={platformPillClass(l.platform)} title={PLATFORM_LABEL[l.platform]}>
              {PLATFORM_SHORT[l.platform]}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(covers): CoverCard component"
```

---

### Task 25: SearchInput ＋ FilterPills 元件

**Files:**
- Create: `components/search-input.tsx`
- Create: `components/filter-pills.tsx`

- [ ] **Step 1: 實作 `components/search-input.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(defaultValue ?? '')
  const [, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sp = new URLSearchParams(params)
    if (value) sp.set('q', value)
    else sp.delete('q')
    sp.delete('cursor')
    startTransition(() => router.push(`/covers?${sp.toString()}`))
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜尋歌名或原唱⋯"
        className="w-full rounded-full bg-card pl-10 pr-4 py-2.5 text-sm shadow-sm outline-none ring-0 placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
        aria-label="搜尋"
      />
    </form>
  )
}
```

- [ ] **Step 2: 實作 `components/filter-pills.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLATFORMS, PLATFORM_LABEL, type Platform } from '@/lib/covers/types'

export function FilterPills({ active }: { active?: Platform }) {
  const router = useRouter()
  const params = useSearchParams()

  function set(platform?: Platform) {
    const sp = new URLSearchParams(params)
    if (platform) sp.set('platform', platform)
    else sp.delete('platform')
    sp.delete('cursor')
    router.push(`/covers?${sp.toString()}`)
  }

  const Pill = ({ label, value, current }: { label: string; value?: Platform; current: boolean }) => (
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

  return (
    <div className="flex flex-wrap gap-1.5">
      <Pill label="全部" current={!active} />
      {PLATFORMS.map((p) => (
        <Pill key={p} label={PLATFORM_LABEL[p]} value={p} current={active === p} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(covers): SearchInput + FilterPills"
```

---

### Task 26: 公開翻唱列表頁

**Files:**
- Create: `app/covers/page.tsx`
- Create: `components/load-more-button.tsx`

- [ ] **Step 1: 實作 `app/covers/page.tsx`（server component）**

```tsx
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CoverCard } from '@/components/cover-card'
import { SearchInput } from '@/components/search-input'
import { FilterPills } from '@/components/filter-pills'
import { LoadMoreButton } from '@/components/load-more-button'
import { listCovers } from '@/lib/covers/queries'
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
  const { items, total, hasMore } = await listCovers(query)

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[480px]">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> 回首頁
        </Link>

        <div className="mt-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">翻唱</h1>
          <span className="text-sm font-bold text-primary">{total} 首</span>
        </div>

        <div className="mt-3">
          <SearchInput defaultValue={query.q} />
        </div>
        <div className="mt-3">
          <FilterPills active={query.platform} />
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <li className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
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

- [ ] **Step 2: 實作 `components/load-more-button.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function LoadMoreButton({ currentOffset, limit }: { currentOffset: number; limit: number }) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onClick() {
    const sp = new URLSearchParams(params)
    sp.set('cursor', String(currentOffset + limit))
    startTransition(() => router.push(`/covers?${sp.toString()}`))
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-full bg-card px-6 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:shadow disabled:opacity-60"
    >
      {pending ? '載入中⋯' : '載入更多'}
    </button>
  )
}
```

> 註：本實作用 URL 參數 + 重新 navigate 達成「載入更多」，每次點都會跳到帶 cursor 的網址（也好分享當下視圖）。若之後想做 append 不刷新，再改成 client-side fetch。

- [ ] **Step 3: 在 Studio 手動塞 3 筆假資料測試**

打開 http://127.0.0.1:54323 → Table editor → covers → Insert row：
- Row 1: title=交換餘生, original_artist=林宥嘉, cover_date=2026-05-01
- Row 2: title=小酒窩, original_artist=林俊傑, cover_date=2026-04-15
- Row 3: title=說好的幸福呢, original_artist=周杰倫, cover_date=2026-03-20

再到 cover_links 各插一筆 platform=youtube、url=https://youtu.be/dQw4w9WgXcQ 對應 cover_id。

- [ ] **Step 4: 手動驗證**

`pnpm dev`，到 http://localhost:3000/covers 應該看到 3 筆翻唱卡片。輸入「林」按 Enter 應該過濾出兩筆。點 YouTube 篩選膠囊應有效。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(covers): public list page with search, filter, load-more"
```

---

## Group J — 翻唱詳情頁

### Task 27: 詳情頁 ＋ YouTube 內嵌

**Files:**
- Create: `app/covers/[id]/page.tsx`

- [ ] **Step 1: 實作**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getCoverById } from '@/lib/covers/queries'
import { PLATFORM_LABEL, type Platform } from '@/lib/covers/types'
import { extractYouTubeId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export default async function CoverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cover = await getCoverById(id)
  if (!cover) notFound()

  const youtubeLink = cover.cover_links.find((l) => l.platform === 'youtube')
  const youtubeId = youtubeLink ? extractYouTubeId(youtubeLink.url) : null

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[560px]">
        <Link href="/covers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> 回翻唱列表
        </Link>

        <article className="mt-4">
          <h1 className="text-2xl font-bold">{cover.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            原唱 {cover.original_artist} · {cover.cover_date}
          </p>

          {youtubeId && (
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-muted">
              <iframe
                className="size-full"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={`${cover.title} 翻唱`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {cover.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-card-foreground">
              {cover.description}
            </p>
          )}

          <div className="mt-6 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary">前往平台</h2>
            <ul className="flex flex-col gap-2">
              {cover.cover_links.map((l) => {
                const label =
                  l.platform === 'other' && l.platform_label
                    ? l.platform_label
                    : PLATFORM_LABEL[l.platform as Platform]
                return (
                  <li key={l.id}>
                    <Link
                      href={l.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-sm hover:shadow"
                    >
                      <span className="text-sm font-semibold">{label}</span>
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </article>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 驗證**

打開 http://localhost:3000/covers，點任一張卡片進詳情頁。預期看到歌名、原唱、YouTube 播放器（若有 YouTube 連結）、平台連結清單。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(covers): detail page with YouTube embed and platform links"
```

---

## Group K — 後台 covers CRUD

### Task 28: 後台 layout ＋ dashboard

**Files:**
- Modify: `app/admin/page.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/logout-button.tsx`

- [ ] **Step 1: 建立 `app/admin/logout-button.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  async function onClick() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      登出
    </Button>
  )
}
```

- [ ] **Step 2: 建立 `app/admin/layout.tsx`**

```tsx
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogoutButton } from './logout-button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-bold">
              後台
            </Link>
            <Link href="/admin/covers" className="text-muted-foreground hover:text-foreground">
              翻唱
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: 改寫 `app/admin/page.tsx`**

```tsx
import Link from 'next/link'
import { PortalCard } from '@/components/portal-card'

export default function AdminHome() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">後台首頁</h1>
      <p className="text-sm text-muted-foreground">管理你的內容</p>
      <div className="mt-3 flex flex-col gap-3">
        <PortalCard href="/admin/covers" label="COVERS" title="翻唱管理" description="新增 ／ 編輯 ／ 刪除" featured />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 驗證**

`pnpm dev`，到 `/admin`，看到後台 layout 與翻唱管理入口；點登出鈕應跳回 `/login` 並把 session 清除。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): layout + dashboard + logout"
```

---

### Task 29: 後台翻唱列表 ＋ 刪除

**Files:**
- Create: `app/admin/covers/page.tsx`
- Create: `app/admin/covers/delete-button.tsx`
- Create: `app/admin/covers/actions.ts`

- [ ] **Step 1: 建立 `app/admin/covers/actions.ts`（server actions）**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteCover(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('covers').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/covers')
  revalidatePath('/covers')
}
```

- [ ] **Step 2: 建立 `app/admin/covers/delete-button.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteCover } from './actions'

export function DeleteButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">刪除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定刪除「{title}」？</AlertDialogTitle>
          <AlertDialogDescription>連同所有平台連結一起刪除，無法復原。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteCover(id))}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? '刪除中⋯' : '確定刪除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: 建立 `app/admin/covers/page.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { listCovers } from '@/lib/covers/queries'
import { DeleteButton } from './delete-button'

export const dynamic = 'force-dynamic'

export default async function AdminCoversPage() {
  const { items, total } = await listCovers({ sort: 'newest', limit: 200, offset: 0 })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">翻唱管理</h1>
          <p className="text-sm text-muted-foreground">共 {total} 首</p>
        </div>
        <Link href="/admin/covers/new">
          <Button>＋ 新增翻唱</Button>
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{c.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {c.original_artist} · {c.cover_date} · {c.cover_links.length} 個連結
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link href={`/admin/covers/${c.id}/edit`}>
                <Button variant="ghost" size="sm">編輯</Button>
              </Link>
              <DeleteButton id={c.id} title={c.title} />
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">還沒有翻唱，點右上新增</li>
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: 驗證**

到 `/admin/covers`，看到 Studio 裡塞的 3 筆。點刪除一筆，確認消失且公開頁 `/covers` 也少一筆。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin/covers): list + delete with confirmation"
```

---

### Task 30: PlatformLinkFields 元件

**Files:**
- Create: `components/admin/platform-link-fields.tsx`

- [ ] **Step 1: 安裝 react-hook-form**

```bash
pnpm add react-hook-form @hookform/resolvers
```

- [ ] **Step 2: 實作 `components/admin/platform-link-fields.tsx`**

```tsx
'use client'

import { Controller, useFieldArray, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLATFORMS, PLATFORM_LABEL } from '@/lib/covers/types'
import type { CoverFormValues } from '@/lib/covers/schema'

export function PlatformLinkFields({ control }: { control: Control<CoverFormValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'links' })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>平台連結</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => append({ platform: 'youtube', platform_label: null, url: '' })}
        >
          ＋ 加一筆
        </Button>
      </div>

      <ul className="space-y-2">
        {fields.map((f, idx) => (
          <li key={f.id} className="rounded-xl border border-border bg-card p-3">
            <div className="grid grid-cols-[120px_1fr_auto] gap-2 items-center">
              <Controller
                control={control}
                name={`links.${idx}.platform` as const}
                render={({ field }) => (
                  <select
                    {...field}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
                    ))}
                  </select>
                )}
              />
              <Controller
                control={control}
                name={`links.${idx}.url` as const}
                render={({ field }) => <Input {...field} placeholder="https://..." />}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                移除
              </Button>
            </div>
            <Controller
              control={control}
              name={`links.${idx}.platform` as const}
              render={({ field: pField }) =>
                pField.value === 'other' ? (
                  <Controller
                    control={control}
                    name={`links.${idx}.platform_label` as const}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="mt-2"
                        placeholder="平台名稱（例如 StreetVoice）"
                      />
                    )}
                  />
                ) : (
                  <></>
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(admin/covers): PlatformLinkFields (dynamic add/remove)"
```

---

### Task 31: ThumbnailUpload 元件

**Files:**
- Create: `components/admin/thumbnail-upload.tsx`

- [ ] **Step 1: 實作**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
}

export function ThumbnailUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('cover-thumbnails')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('cover-thumbnails').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="size-20 shrink-0 rounded-xl bg-muted" style={value ? { background: `center/cover no-repeat url('${value}')` } : undefined} />
        <div className="space-y-1">
          <label className="inline-block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
            <Button asChild variant="outline" size="sm" disabled={uploading}>
              <span>{uploading ? '上傳中⋯' : value ? '更換縮圖' : '上傳縮圖'}</span>
            </Button>
          </label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              移除
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(admin/covers): ThumbnailUpload to Supabase Storage"
```

---

### Task 32: CoverForm 組合（含 YouTube 自動帶縮圖）

**Files:**
- Create: `components/admin/cover-form.tsx`

- [ ] **Step 1: 實作**

```tsx
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { coverFormSchema, type CoverFormValues } from '@/lib/covers/schema'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'
import { PlatformLinkFields } from './platform-link-fields'
import { ThumbnailUpload } from './thumbnail-upload'
import { saveCover } from '@/app/admin/covers/actions'

type Props = {
  initialValues?: Partial<CoverFormValues> & { id?: string }
  onDone?: () => void
}

export function CoverForm({ initialValues }: Props) {
  const router = useRouter()
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CoverFormValues>({
    resolver: zodResolver(coverFormSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      original_artist: initialValues?.original_artist ?? '',
      cover_date: initialValues?.cover_date ?? new Date().toISOString().slice(0, 10),
      description: initialValues?.description ?? null,
      tags: initialValues?.tags ?? [],
      thumbnail_url: initialValues?.thumbnail_url ?? null,
      links: initialValues?.links ?? [{ platform: 'youtube', platform_label: null, url: '' }],
    },
  })

  // 若有 YouTube 連結且 thumbnail 為空，自動帶 YouTube 縮圖
  const links = watch('links')
  const thumb = watch('thumbnail_url')
  useEffect(() => {
    if (thumb) return
    for (const l of links ?? []) {
      if (l.platform === 'youtube') {
        const id = extractYouTubeId(l.url)
        if (id) {
          setValue('thumbnail_url', youtubeThumbnail(id), { shouldValidate: false })
          break
        }
      }
    }
  }, [links, thumb, setValue])

  async function onSubmit(values: CoverFormValues) {
    await saveCover({ id: initialValues?.id, values })
    router.push('/admin/covers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">歌名</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="original_artist">原唱</Label>
        <Input id="original_artist" {...register('original_artist')} />
        {errors.original_artist && <p className="text-xs text-destructive">{errors.original_artist.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover_date">發布日</Label>
        <Input id="cover_date" type="date" {...register('cover_date')} />
        {errors.cover_date && <p className="text-xs text-destructive">{errors.cover_date.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">心得／簡介（可空）</Label>
        <textarea
          id="description"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('description', { setValueAs: (v: string) => (v?.trim() ? v : null) })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags">類型標籤（用逗號分隔，可空）</Label>
        <Input
          id="tags"
          defaultValue={(getValues('tags') ?? []).join(', ')}
          onChange={(e) =>
            setValue(
              'tags',
              e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
              { shouldValidate: true },
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label>縮圖</Label>
        <p className="text-xs text-muted-foreground">填了 YouTube 連結會自動帶縮圖，也可手動上傳覆蓋。</p>
        <ThumbnailUpload value={watch('thumbnail_url')} onChange={(v) => setValue('thumbnail_url', v)} />
      </div>

      <PlatformLinkFields control={control} />
      {errors.links && typeof errors.links.message === 'string' && (
        <p className="text-xs text-destructive">{errors.links.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>取消</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '儲存中⋯' : '儲存'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: 擴充 `app/admin/covers/actions.ts` 加 saveCover**

把該檔案完整覆蓋為：

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { coverFormSchema, type CoverFormValues } from '@/lib/covers/schema'

export async function deleteCover(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('covers').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/covers')
  revalidatePath('/covers')
}

export async function saveCover(input: { id?: string; values: CoverFormValues }) {
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
      })
      .eq('id', coverId)
    if (error) throw error
    // 重置 links：刪掉再插入（簡單可靠，量少不痛）
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

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(admin/covers): CoverForm (RHF + Zod) + saveCover action"
```

---

### Task 33: 新增頁面

**Files:**
- Create: `app/admin/covers/new/page.tsx`

- [ ] **Step 1: 實作**

```tsx
import { CoverForm } from '@/components/admin/cover-form'

export default function NewCoverPage() {
  return (
    <div>
      <h1 className="text-xl font-bold">新增翻唱</h1>
      <p className="mb-4 text-sm text-muted-foreground">填寫資訊，至少要有一個平台連結。</p>
      <CoverForm />
    </div>
  )
}
```

- [ ] **Step 2: 手動驗證**

到 `/admin/covers/new`，新增一首翻唱（貼 YouTube 連結後縮圖應自動帶入）。儲存後回到列表看到新項目，公開 `/covers` 也看到。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(admin/covers): new cover page"
```

---

### Task 34: 編輯頁面

**Files:**
- Create: `app/admin/covers/[id]/edit/page.tsx`

- [ ] **Step 1: 實作**

```tsx
import { notFound } from 'next/navigation'
import { CoverForm } from '@/components/admin/cover-form'
import { getCoverById } from '@/lib/covers/queries'

export default async function EditCoverPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cover = await getCoverById(id)
  if (!cover) notFound()

  return (
    <div>
      <h1 className="text-xl font-bold">編輯翻唱</h1>
      <p className="mb-4 text-sm text-muted-foreground">{cover.title}</p>
      <CoverForm
        initialValues={{
          id: cover.id,
          title: cover.title,
          original_artist: cover.original_artist,
          cover_date: cover.cover_date,
          description: cover.description,
          tags: cover.tags,
          thumbnail_url: cover.thumbnail_url,
          links: cover.cover_links.map((l) => ({
            platform: l.platform,
            platform_label: l.platform_label,
            url: l.url,
          })),
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: 手動驗證**

到 `/admin/covers`，點任一筆「編輯」進到表單，改動後儲存。回列表看到改動，公開頁也跟著變。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(admin/covers): edit cover page"
```

---

## Group L — E2E 測試

### Task 35: E2E：公開列表搜尋／篩選

**Files:**
- Create: `e2e/covers.spec.ts`
- Create: `e2e/fixtures/seed.ts`

E2E 假設 `supabase start` 已跑、test 帳號存在、且 DB 由測試自己 seed。

- [ ] **Step 1: 安裝 supabase-js（已在生產依賴中）**

直接使用既有 `@supabase/supabase-js`。需要 service_role key 才能在測試中繞過 RLS 種資料：

把 service_role key（從 `supabase status` 取得）加到 `.env.local`：

```
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

- [ ] **Step 2: 建立 `e2e/fixtures/seed.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function resetCovers() {
  const sb = adminClient()
  await sb.from('cover_links').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('covers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

export async function seedCovers() {
  const sb = adminClient()
  const fixtures = [
    { title: '交換餘生', original_artist: '林宥嘉', cover_date: '2026-05-01', links: [
      { platform: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { platform: 'instagram', url: 'https://instagram.com/p/abc' },
    ]},
    { title: '小酒窩', original_artist: '林俊傑', cover_date: '2026-04-15', links: [
      { platform: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' },
    ]},
    { title: '說好的幸福呢', original_artist: '周杰倫', cover_date: '2026-03-20', links: [
      { platform: 'threads', url: 'https://www.threads.net/@juniswang/post/abc' },
    ]},
  ]
  for (const f of fixtures) {
    const { data } = await sb.from('covers').insert({
      title: f.title,
      original_artist: f.original_artist,
      cover_date: f.cover_date,
    }).select('id').single()
    await sb.from('cover_links').insert(
      f.links.map((l) => ({ cover_id: data!.id, platform: l.platform, url: l.url, platform_label: null })),
    )
  }
}
```

- [ ] **Step 3: 寫 E2E `e2e/covers.spec.ts`**

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

test('依平台篩選只顯示 Threads 的', async ({ page }) => {
  await page.goto('/covers')
  await page.getByRole('button', { name: 'Threads' }).click()
  await expect(page.getByText('說好的幸福呢')).toBeVisible()
  await expect(page.getByText('小酒窩')).toBeHidden()
})

test('點卡片進詳情頁', async ({ page }) => {
  await page.goto('/covers')
  await page.getByText('交換餘生').click()
  await expect(page.locator('h1', { hasText: '交換餘生' })).toBeVisible()
  await expect(page.locator('iframe')).toBeVisible()
})
```

- [ ] **Step 4: 跑 E2E**

```bash
pnpm test:e2e
```

預期：4 passed。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(e2e): covers list search/filter/detail flows"
```

---

### Task 36: E2E：admin 登入 ＋ 新增

**Files:**
- Create: `e2e/admin.spec.ts`

- [ ] **Step 1: 確認 admin 測試帳號**

需要一個固定的測試 email + 密碼。在 `.env.local` 加：

```
E2E_ADMIN_EMAIL=junwangwrk@gmail.com
E2E_ADMIN_PASSWORD=<你在 Task 12 設定的密碼>
```

- [ ] **Step 2: 寫 E2E `e2e/admin.spec.ts`**

```ts
import { test, expect } from '@playwright/test'
import { resetCovers } from './fixtures/seed'

test.beforeEach(async () => {
  await resetCovers()
})

test('未登入訪問 /admin 被導向 /login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login$/)
})

test('登入 → 新增翻唱 → 在公開頁看到', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!)
  await page.getByLabel('密碼').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: '登入' }).click()
  await expect(page).toHaveURL(/\/admin/)

  await page.goto('/admin/covers/new')
  await page.getByLabel('歌名').fill('測試曲')
  await page.getByLabel('原唱').fill('測試原唱')
  await page.getByLabel('發布日').fill('2026-05-26')
  await page.locator('input[placeholder="https://..."]').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: '儲存' }).click()
  await expect(page).toHaveURL(/\/admin\/covers$/)
  await expect(page.getByText('測試曲')).toBeVisible()

  await page.goto('/covers')
  await expect(page.getByText('測試曲')).toBeVisible()
})
```

- [ ] **Step 3: 跑 E2E**

```bash
pnpm test:e2e
```

預期：admin spec 全綠。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(e2e): admin login + create flow"
```

---

## 最後

### Task 37: README quickstart

**Files:**
- Create: `README.md`

- [ ] **Step 1: 撰寫**

```markdown
# Jun Website

王嘉駿（Jun Wang）個人網站。前端工程師 ／ 音樂人。

## 技術棧

Next.js（App Router）／ TypeScript ／ Tailwind CSS v4 ／ shadcn/ui ／ React Hook Form + Zod ／ Supabase（Postgres + Auth + Storage）／ Vitest ／ Playwright。

## 開發環境前置需求

- Node.js 20+
- pnpm
- OrbStack（或其他 Docker 相容環境）
- Supabase CLI: `brew install supabase/tap/supabase`

## 第一次起動

```bash
pnpm install
supabase start                  # 啟動本機 Supabase（OrbStack 需在執行中）
cp .env.local.example .env.local
# 把 supabase status 印出的 anon key、service role key 填入 .env.local
```

到 http://127.0.0.1:54323（Supabase Studio）→ Authentication → Add user，建立 admin 帳號，email 要對應 `.env.local` 的 `ADMIN_EMAIL_ALLOWLIST`。

```bash
pnpm dev
```

打開 http://localhost:3000。

## 測試

```bash
pnpm test          # 單元 + 元件
pnpm test:e2e      # E2E（會自動拉 dev server）
pnpm lint
pnpm format:check
```

## 常用指令

- `supabase start` / `supabase stop`
- `supabase db reset` 套用所有 migration 並重置 DB（會清掉 auth users，需重建測試帳號）
- `supabase migration new <name>` 產生新的 migration

## 資料夾

- `app/` — Next.js 路由（含 public 與 `/admin`）
- `components/` — UI 元件（`ui/` 為 shadcn 複製的元件）
- `lib/` — 純邏輯：Supabase client、covers 查詢、schema、youtube 工具
- `supabase/` — 本機 Supabase 設定與 migrations
- `tests/` — Vitest 單元／元件
- `e2e/` — Playwright

## 設計與規格

- 設計：`docs/superpowers/specs/2026-05-26-jun-website-design.md`
- 實作計畫：`docs/superpowers/plans/2026-05-26-jun-website.md`
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: README quickstart"
```

---

### Task 38: Phase 1 收尾驗證

**Files:** 無；只是驗證

- [ ] **Step 1: 全測試跑過**

```bash
pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e
```

預期：全綠。

- [ ] **Step 2: 手動體驗清單**

- 首頁傳送門正常，「翻唱清單」卡片連到 `/covers` 且不再 404
- `/covers` 顯示資料、搜尋、平台篩選、超過 20 筆有「載入更多」
- 詳情頁可正常播放 YouTube 內嵌
- 後台可新增、編輯、刪除翻唱
- 新增時貼 YouTube 連結自動帶縮圖；可手動上傳覆蓋
- 編輯後公開頁立即反映
- 刪除後二次確認、確認後即時消失

- [ ] **Step 3: Tag Phase 1**

```bash
git tag phase-1-covers
```

---

# 後續未涵蓋（之後階段獨立 spec）

- 文章／部落格（後台寫作、Markdown 渲染、程式碼高亮）
- 關於我頁面
- 作品集頁面（音樂 ＋ 網頁專案）
- 部署上線（Vercel）
- 英文版／多語系
- 翻唱列表 1000 筆以上時改用 keyset 分頁
- 為「依類型標籤篩選」加 UI（資料層已支援，未做 UI）

完成 Phase 0 + 1 後可任選下一個方向，各自走一輪 brainstorming → spec → plan。

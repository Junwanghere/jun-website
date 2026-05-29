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
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
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
  // 1. 找該 email 是否已存在（用 per_page 取回列表後精確比對 email）
  const list = await adminReq('GET', 'admin/users?per_page=200')
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

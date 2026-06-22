#!/usr/bin/env node
/**
 * 把 scripts/threads-descriptions.json 的歌詞片段寫進 covers.description。
 *
 * 比對方式：以歌名（covers.title）找 cover。
 * 安全策略：只在 description 目前為空時才寫入；已有內容者跳過並回報
 *           （避免覆蓋既有的「椅子樂團ver.」「OST」等註記）。
 *
 * 連線設定：process.env 優先（可指向雲端），否則讀 .env.local（本機）。
 *
 * 用法（本機）：node scripts/seed-threads-descriptions.mjs
 * 用法（雲端）：NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-threads-descriptions.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(REPO_ROOT, '.env.local'), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim()
    }
    return env
  } catch {
    return {}
  }
}

const fileEnv = loadEnvLocal()
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
console.log(`Target: ${SUPABASE_URL}`)

const HEADERS = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
}

async function req(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const enc = (v) => encodeURIComponent(v)

async function main() {
  const items = JSON.parse(
    readFileSync(resolve(REPO_ROOT, 'scripts/threads-descriptions.json'), 'utf8'),
  )
  console.log(`Loaded ${items.length} lyric snippets`)

  let set = 0
  const skipped = []
  const notFound = []
  for (const it of items) {
    const rows = await req('GET', `covers?title=eq.${enc(it.song)}&select=id,description`)
    if (!rows || rows.length === 0) {
      notFound.push(it.song)
      continue
    }
    const cur = rows[0].description
    if (cur && cur.trim()) {
      skipped.push(it.song)
      continue
    }
    await req('PATCH', `covers?id=eq.${rows[0].id}`, { description: it.description })
    set += 1
    console.log(`  [${set}] ${it.song}`)
  }

  console.log(`\nDone. Set description on ${set} covers.`)
  if (skipped.length) console.log(`\n• 跳過（已有 description，未覆蓋）：${skipped.join('、')}`)
  if (notFound.length) console.log(`\n• 找不到歌名：${notFound.join('、')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

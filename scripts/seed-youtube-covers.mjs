#!/usr/bin/env node
/**
 * 把 scripts/youtube-covers.json 的資料塞進本機 Supabase。
 *
 * 用 raw fetch 打 PostgREST，跟 e2e/fixtures/seed.ts 同一個模式
 * （避免 supabase-js 在 Node 起 Realtime client 的 WebSocket 問題）。
 *
 * 行為：先清空 cover_links + covers（清單回到一致狀態），再依 JSON 逐筆插入。
 * 每首翻唱對應一筆 covers + 一筆 cover_links（platform=youtube）。
 *
 * 用法：
 *   pnpm seed:covers
 * 或：
 *   node scripts/seed-youtube-covers.mjs
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
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function main() {
  // 1. 讀 JSON
  const dataPath = resolve(REPO_ROOT, 'scripts/youtube-covers.json')
  const items = JSON.parse(readFileSync(dataPath, 'utf8'))
  console.log(`Loaded ${items.length} covers from ${dataPath}`)

  // 2. 清空既有資料（cover_links 先，因為有 FK）
  // PostgREST 的 DELETE 需要 filter；用 neq 一個不會存在的值 = 全刪
  console.log('Clearing existing cover_links + covers...')
  await req('DELETE', `cover_links?id=neq.00000000-0000-0000-0000-000000000000`)
  await req('DELETE', `covers?id=neq.00000000-0000-0000-0000-000000000000`)

  // 3. 逐筆插入
  let ok = 0
  for (const item of items) {
    const ymd = item.upload // 'YYYYMMDD'
    const cover_date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
    const thumbnail_url = `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`

    const [inserted] = await req('POST', 'covers', {
      title: item.song,
      original_artist: item.artist,
      cover_date,
      thumbnail_url,
      description: item.note ?? null,
      tags: [],
    })

    await req('POST', 'cover_links', {
      cover_id: inserted.id,
      platform: 'youtube',
      platform_label: null,
      url: `https://youtu.be/${item.id}`,
    })

    ok += 1
    console.log(`  [${ok}/${items.length}] ${item.song} / ${item.artist}`)
  }

  console.log(`\nDone. Seeded ${ok} covers.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

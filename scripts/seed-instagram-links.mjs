#!/usr/bin/env node
/**
 * 把 scripts/instagram-links.json 的 Instagram 連結灌進 cover_links（platform=instagram）。
 *
 * 比對方式：以歌名（covers.title）找對應的 cover，再為它新增一筆 instagram 連結。
 * 冪等：每首先刪掉既有的 instagram 連結再插入，重跑不會重複。
 *
 * 連線設定：process.env 優先（可指向雲端），否則讀 .env.local（本機）。
 *
 * 用法（本機）：node scripts/seed-instagram-links.mjs
 * 用法（雲端）：NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-instagram-links.mjs
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

function enc(v) {
  return encodeURIComponent(v)
}

async function main() {
  const links = JSON.parse(readFileSync(resolve(REPO_ROOT, 'scripts/instagram-links.json'), 'utf8'))
  console.log(`Loaded ${links.length} instagram links`)

  let ok = 0
  const notFound = []
  for (const link of links) {
    // 用歌名找 cover（title 唯一性足夠；同名極少，真的有再人工處理）
    const rows = await req('GET', `covers?title=eq.${enc(link.song)}&select=id,title`)
    if (!rows || rows.length === 0) {
      notFound.push(link.song)
      continue
    }
    const coverId = rows[0].id
    // 冪等：先刪掉這首既有的 instagram 連結
    await req('DELETE', `cover_links?cover_id=eq.${coverId}&platform=eq.instagram`)
    await req('POST', 'cover_links', {
      cover_id: coverId,
      platform: 'instagram',
      platform_label: null,
      url: link.url,
    })
    ok += 1
    console.log(`  [${ok}] ${link.song} → ${link.url}`)
  }

  console.log(`\nDone. Inserted ${ok} instagram links.`)
  if (notFound.length) {
    console.log(`\n⚠ ${notFound.length} 首在 DB 找不到對應歌名（略過）：`)
    console.log('  ' + notFound.join('、'))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

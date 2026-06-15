#!/usr/bin/env node
/**
 * 從 yt-dlp 撈下來的頻道 metadata（TSV：id\tupload_date\ttitle）建出
 * scripts/youtube-covers.json。
 *
 * 大多數標題是規則格式（〈歌〉- 歌手 (Cover by Jun) / 歌 - 歌手 (Jun cover)），
 * 用 parser 處理；少數舊片標題沒寫歌手或格式特殊（含歌手/歌名顛倒的），
 * 用 OVERRIDES（以影片 id 為 key）手動校正。原唱來源：影片說明欄 hashtag + 查證。
 *
 * 用法：node scripts/build-covers-json.mjs <raw.tsv>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const tsvPath = process.argv[2] || '/tmp/jun-covers-raw.tsv'

// id → { song, artist, note }：標題未含原唱、或格式特殊需要校正者
const OVERRIDES = {
  TUx31AJIWxg: { song: 'P.S.我愛你', artist: 'A-Lin', note: null },
  EitiG58Vx0c: { song: '一夜一夜一夜', artist: '河智昊', note: null },
  BfKs98K0RSM: { song: '慢冷', artist: '梁靜茹', note: null },
  HmgefB9Jslk: { song: '滿ちてゆく', artist: '藤井風', note: null },
  rCXNI3wmrmk: { song: '淚橋', artist: '伍佰', note: null },
  'V-G9EmcxF7I': { song: '你還是你嗎', artist: '魏如萱', note: null },
  c4p2ORZ_BSc: { song: '天黑黑', artist: '孫燕姿', note: null },
  qa83Wtpo6bg: { song: '後來', artist: '劉若英', note: null },
  nDNKVFpFcyU: { song: '踮起腳尖愛', artist: '洪佩瑜', note: null },
  aKJDSC1t6mI: { song: '大雨', artist: '金智娟', note: null },
  '3a5CcfI5U-A': { song: '給你給我', artist: '蘇打綠', note: null },
  KrClvLeTIUo: { song: '才二十三', artist: '太一', note: null },
  icOVeQs_O8Y: { song: 'Easy', artist: 'LE SSERAFIM', note: null },
  lAFqWys8WCo: { song: 'Wish You The Best', artist: 'Lewis Capaldi', note: null },
  xK0Kl2k4o0w: { song: '眼淚記得你', artist: '孫盛希', note: null },
  '4HXROvhPZZs': { song: 'Ditto', artist: 'NewJeans', note: null },
  co_ESD_jGBY: { song: 'White Christmas', artist: 'Bing Crosby', note: null },
  G0QxoqYNRlk: { song: 'Moon River', artist: 'Audrey Hepburn', note: null },
  QWG2_AwDYyA: { song: 'To you 너에게', artist: 'HEN헨', note: 'Hi! Bye, Mama! OST' },
  HA3WsWMszv4: { song: 'Sweet Hurricane', artist: 'Phum Viphurit', note: null },
  lpmTOadidXo: { song: 'Lover Boy', artist: 'Phum Viphurit', note: null },
}

// 移除標題尾端的「翻唱標記」括號（右括號可能缺、可能全形、可能無空格）
const MARKER = /\s*[（(]\s*(cover\s*by\s*jun|jun\s*cover|jun\s*practice|cover\s*by\s*shi(?:ao|er)\s*jun)\s*[)）]?\s*$/i

function parseRegular(title) {
  let t = title.replace(MARKER, '').trim()

  // 〈歌名〉- 歌手 [(...ver.)]
  const ang = t.match(/^〈\s*([^〉]+?)\s*〉(.*)$/)
  if (ang) {
    const song = ang[1].trim()
    let rest = ang[2].replace(/^[\s\-－—]+/, '').trim()
    let note = null
    const verM = rest.match(/[（(]\s*([^()（）]*ver\.?)\s*[)）]\s*$/i)
    if (verM) {
      note = verM[1].trim()
      rest = rest.slice(0, verM.index).trim()
    }
    return { song, artist: rest, note }
  }

  // 歌名 - 歌手（破折號格式）
  const dash = t.split(/\s+-\s+/)
  if (dash.length >= 2) {
    const song = dash[0].trim()
    const artist = dash.slice(1).join(' - ').trim()
    return { song, artist, note: null }
  }

  return null // 無法解析
}

const lines = readFileSync(tsvPath, 'utf8').split('\n').filter((l) => l.trim())
const out = []
const unresolved = []

for (const line of lines) {
  const [id, upload, ...rest] = line.split(/\t|\\t/)
  const raw_title = rest.join('\t')
  if (!id || !upload) continue

  let parsed
  if (OVERRIDES[id]) {
    parsed = OVERRIDES[id]
  } else {
    parsed = parseRegular(raw_title)
  }

  if (!parsed || !parsed.song || !parsed.artist) {
    unresolved.push({ id, raw_title })
    continue
  }

  out.push({
    id,
    raw_title,
    song: parsed.song,
    artist: parsed.artist,
    note: parsed.note ?? null,
    upload,
  })
}

const outPath = resolve(REPO_ROOT, 'scripts/youtube-covers.json')
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')

console.log(`Wrote ${out.length} covers → ${outPath}`)
if (unresolved.length) {
  console.log(`\n⚠ 無法解析 ${unresolved.length} 筆，需人工處理：`)
  for (const u of unresolved) console.log(`  ${u.id}  ${u.raw_title}`)
}

// 解析 YouTube 標題。只認全形書名號 〈〉 的格式：
// 〈歌名〉- 歌手 (Cover by Jun)   破折號可為 - 或 －，Cover 括號可全/半形。
// 命不中就回 { null, null }，呼叫端自行 fallback。
export function parseCoverTitle(rawTitle: string): {
  song: string | null
  artist: string | null
} {
  const m = rawTitle.match(/〈(.+?)〉\s*[-－]\s*(.+)/)
  if (!m) return { song: null, artist: null }
  const song = m[1].trim()
  // 去掉結尾的 (Cover by Jun) / （Cover by Jun) 等
  const artist = m[2].replace(/\s*[（(]\s*cover\b.*$/i, '').trim()
  if (!song || !artist) return { song: null, artist: null }
  return { song, artist }
}

export type FeedEntry = {
  videoId: string
  title: string
  published: string
  description: string
}

// 輕量解析（不加 XML 套件）：先切出每個 <entry>…</entry>，再各自抓欄位。
// 注意只取 entry 內的 <title>，避免抓到 feed 頂層的頻道標題。
export function parseChannelFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  const blocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/g) ?? []
  for (const block of blocks) {
    const videoId = block.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const published = block.match(/<published>(.*?)<\/published>/)?.[1]
    const description = block.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]
    if (videoId && title && published) {
      entries.push({
        videoId,
        title: decodeXml(title.trim()),
        published,
        description: description ? decodeXml(description) : '',
      })
    }
  }
  return entries
}

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

export async function fetchChannelFeed(channelId: string): Promise<FeedEntry[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`YouTube RSS ${res.status}`)
  return parseChannelFeed(await res.text())
}

// 依已收錄的 videoId 集合過濾，回傳尚未收錄的新片。
export function selectNewEntries(entries: FeedEntry[], existingIds: Set<string>): FeedEntry[] {
  return entries.filter((e) => !existingIds.has(e.videoId))
}

// 判斷是不是 Shorts。RSS 不標記 Shorts，但 youtube.com/shorts/{id} 對「真正的 Short」
// 回 200，對一般影片則 303 轉址到 /watch。用 redirect:manual 攔下轉址、只看狀態碼。
// 檢查失敗一律回 false（當一般影片）——寧可多建一筆草稿讓人刪，也不要漏掉真正的翻唱。
export async function isShort(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
    })
    return res.status === 200
  } catch {
    return false
  }
}

// 從影片描述抽出歌詞段落：去掉開頭的標題行與結尾的 hashtag 行，中間即歌詞。
export function extractLyrics(description: string, videoTitle: string): string {
  const lines = description.replace(/\r/g, '').split('\n')
  // 1. 尾端：砍掉空行與「整行都是 hashtag」的行
  while (
    lines.length &&
    (lines[lines.length - 1].trim() === '' || isHashtagLine(lines[lines.length - 1]))
  ) {
    lines.pop()
  }
  // 2. 開頭：只在確實是標題時砍掉
  if (lines.length && looksLikeTitle(lines[0], videoTitle)) lines.shift()
  // 3. 砍掉開頭殘留的空行
  while (lines.length && lines[0].trim() === '') lines.shift()
  return lines.join('\n').trim()
}

// 整行都是 #hashtag（混了其他文字的行不算，例如「副歌 #翻唱」）
function isHashtagLine(line: string): boolean {
  const toks = line.trim().split(/\s+/)
  return toks[0] !== '' && toks.every((t) => t.startsWith('#'))
}

// 第 0 行含〈〉，或正規化後是影片標題的前綴 → 視為標題行
function looksLikeTitle(line: string, videoTitle: string): boolean {
  if (line.includes('〈') && line.includes('〉')) return true
  const n0 = normalizeTitle(line)
  return n0.length > 0 && normalizeTitle(videoTitle).startsWith(n0)
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[〈〉()（）\s\-－]/g, '')
    .replace(/coverbyjun/g, '')
}

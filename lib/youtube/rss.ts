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
    if (videoId && title && published) {
      entries.push({ videoId, title: decodeXml(title.trim()), published })
    }
  }
  return entries
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export async function fetchChannelFeed(channelId: string): Promise<FeedEntry[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`YouTube RSS ${res.status}`)
  return parseChannelFeed(await res.text())
}

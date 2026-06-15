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

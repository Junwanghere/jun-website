/** 純顯示用：把歌名包上單書名號 〈〉。資料層不使用此函式。 */
export function formatSongTitle(title: string): string {
  if (!title.trim()) return title
  if (title.startsWith('〈')) return title
  return `〈${title}〉`
}

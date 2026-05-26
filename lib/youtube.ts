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

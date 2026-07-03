import { AUTHOR_NAME, AUTHOR_ALT_NAME, SITE_NAME, SITE_URL, SOCIAL_LINKS } from '@/lib/site'

// schema.org 結構化資料 builder（純函式）。輸出物件以 <script type="application/ld+json"> 注入頁面。

/**
 * 序列化 JSON-LD 供 <script> 內嵌。JSON.stringify 不會跳脫 < > &，若資料含外部/使用者輸入
 * （如 YouTube 抓來的標題），字串內的 </script> 可提前關閉標籤造成 XSS。這裡把這三個字元
 * 轉成 unicode 逸出序列，語意不變但無法被瀏覽器當成 HTML 解析。
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    alternateName: AUTHOR_ALT_NAME,
    url: SITE_URL,
    sameAs: SOCIAL_LINKS,
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }
}

type MusicRecordingInput = {
  id: string
  title: string
  original_artist: string
  thumbnail_url: string | null
  cover_date: string
}

export function musicRecordingJsonLd(cover: MusicRecordingInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: cover.title, // 歌名
    byArtist: { '@type': 'MusicGroup', name: cover.original_artist }, // 原唱
    url: `${SITE_URL}/covers/${cover.id}`,
    datePublished: cover.cover_date,
    ...(cover.thumbnail_url ? { image: cover.thumbnail_url } : {}),
  }
}

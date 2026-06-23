import { AUTHOR_NAME, AUTHOR_ALT_NAME, SITE_NAME, SITE_URL, SOCIAL_LINKS } from '@/lib/site'

// schema.org 結構化資料 builder（純函式）。輸出物件以 <script type="application/ld+json"> 注入頁面。

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

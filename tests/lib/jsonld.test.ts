import { describe, it, expect } from 'vitest'
import { personJsonLd, websiteJsonLd, musicRecordingJsonLd } from '@/lib/seo/jsonld'
import { SITE_URL } from '@/lib/site'

describe('personJsonLd', () => {
  it('Person，含名字與社群 sameAs', () => {
    const o = personJsonLd()
    expect(o['@type']).toBe('Person')
    expect(o.name).toBe('王嘉駿')
    expect(o.url).toBe(SITE_URL)
    expect(o.sameAs).toContain('https://www.youtube.com/@junwang0917')
  })
})

describe('websiteJsonLd', () => {
  it('WebSite，url 為站台網址', () => {
    const o = websiteJsonLd()
    expect(o['@type']).toBe('WebSite')
    expect(o.url).toBe(SITE_URL)
  })
})

describe('musicRecordingJsonLd', () => {
  const cover = {
    id: 'abc123',
    title: '醉後喜歡我',
    original_artist: '冰球樂團',
    thumbnail_url: 'https://img.youtube.com/vi/x/hqdefault.jpg',
    cover_date: '2026-06-13',
  }

  it('MusicRecording，歌名 / 原唱 / 連結正確', () => {
    const o = musicRecordingJsonLd(cover)
    expect(o['@type']).toBe('MusicRecording')
    expect(o.name).toBe('醉後喜歡我')
    expect(o.byArtist).toEqual({ '@type': 'MusicGroup', name: '冰球樂團' })
    expect(o.url).toBe(`${SITE_URL}/covers/abc123`)
    expect(o.image).toBe(cover.thumbnail_url)
    expect(o.datePublished).toBe('2026-06-13')
  })

  it('沒有縮圖時不放 image 欄位', () => {
    const o = musicRecordingJsonLd({ ...cover, thumbnail_url: null })
    expect('image' in o).toBe(false)
  })

  it('可被 JSON.stringify（含特殊字元歌名）', () => {
    const o = musicRecordingJsonLd({ ...cover, title: '〈梅雨季〉"test"' })
    expect(() => JSON.stringify(o)).not.toThrow()
    expect(JSON.parse(JSON.stringify(o)).name).toBe('〈梅雨季〉"test"')
  })
})

import { describe, it, expect } from 'vitest'
import { coverFormSchema } from '@/lib/covers/schema'

describe('coverFormSchema', () => {
  const valid = {
    title: '交換餘生',
    original_artist: '林宥嘉',
    cover_date: '2026-05-01',
    description: null,
    tags: [],
    thumbnail_url: null,
    links: [{ platform: 'youtube', platform_label: null, url: 'https://youtu.be/dQw4w9WgXcQ' }],
  }

  it('合法資料通過', () => {
    expect(coverFormSchema.safeParse(valid).success).toBe(true)
  })

  it('title 不能為空', () => {
    const r = coverFormSchema.safeParse({ ...valid, title: '' })
    expect(r.success).toBe(false)
  })

  it('日期格式錯誤被拒', () => {
    expect(coverFormSchema.safeParse({ ...valid, cover_date: '2026/05/01' }).success).toBe(false)
  })

  it('連結網址必須是合法 URL', () => {
    expect(
      coverFormSchema.safeParse({
        ...valid,
        links: [{ platform: 'youtube', platform_label: null, url: 'not a url' }],
      }).success,
    ).toBe(false)
  })

  it('platform=other 時 platform_label 必填', () => {
    expect(
      coverFormSchema.safeParse({
        ...valid,
        links: [{ platform: 'other', platform_label: null, url: 'https://example.com' }],
      }).success,
    ).toBe(false)
    expect(
      coverFormSchema.safeParse({
        ...valid,
        links: [{ platform: 'other', platform_label: 'StreetVoice', url: 'https://example.com' }],
      }).success,
    ).toBe(true)
  })

  it('至少要有一筆連結', () => {
    expect(coverFormSchema.safeParse({ ...valid, links: [] }).success).toBe(false)
  })
})

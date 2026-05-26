import { describe, it, expect } from 'vitest'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'

describe('extractYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLxxx', 'dQw4w9WgXcQ'],
  ])('解析 %s -> %s', (url, expected) => {
    expect(extractYouTubeId(url)).toBe(expected)
  })

  it('非 YouTube 連結回 null', () => {
    expect(extractYouTubeId('https://example.com')).toBeNull()
    expect(extractYouTubeId('not a url')).toBeNull()
  })
})

describe('youtubeThumbnail', () => {
  it('組合縮圖網址', () => {
    expect(youtubeThumbnail('abc123XYZ_-')).toBe('https://img.youtube.com/vi/abc123XYZ_-/hqdefault.jpg')
  })
})

import { describe, it, expect } from 'vitest'
import { formatSongTitle } from '@/lib/covers/format'

describe('formatSongTitle', () => {
  it('一般歌名包上單書名號', () => {
    expect(formatSongTitle('台北某個地方')).toBe('〈台北某個地方〉')
  })

  it('已以 〈 開頭者不重複包', () => {
    expect(formatSongTitle('〈牽掛〉')).toBe('〈牽掛〉')
  })

  it('空字串或純空白原樣回傳', () => {
    expect(formatSongTitle('')).toBe('')
    expect(formatSongTitle('   ')).toBe('   ')
  })
})

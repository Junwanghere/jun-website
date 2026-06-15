import { describe, it, expect } from 'vitest'
import { parseCoverTitle } from '@/lib/youtube/rss'

describe('parseCoverTitle', () => {
  it('標準格式：〈歌名〉- 歌手 （Cover by Jun)', () => {
    expect(parseCoverTitle('〈不想和你分開〉- 椅子樂團 （Cover by Jun)')).toEqual({
      song: '不想和你分開',
      artist: '椅子樂團',
    })
  })

  it('半形括號的 (Cover by Jun) 也認得', () => {
    expect(parseCoverTitle('〈梅雨季〉- 張震嶽 (Cover by Jun)')).toEqual({
      song: '梅雨季',
      artist: '張震嶽',
    })
  })

  it('英文歌名與英文歌手', () => {
    expect(parseCoverTitle('〈seasons〉- wave to earth (Cover by Jun)')).toEqual({
      song: 'seasons',
      artist: 'wave to earth',
    })
  })

  it('沒有書名號 → 解析失敗回 null', () => {
    expect(parseCoverTitle('梅雨季 cover')).toEqual({ song: null, artist: null })
  })

  it('有書名號但缺破折號分隔 → 解析失敗回 null', () => {
    expect(parseCoverTitle('〈隨便唱唱〉一些雜記')).toEqual({ song: null, artist: null })
  })
})

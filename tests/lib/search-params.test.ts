import { describe, it, expect } from 'vitest'
import { parseSearchParams } from '@/lib/covers/search-params'

describe('parseSearchParams', () => {
  it('沒有參數時用預設值', () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      platform: undefined,
      tag: undefined,
      sort: 'newest',
      limit: 20,
      offset: 0,
    })
  })

  it('解析 q / platform / tag / sort', () => {
    expect(
      parseSearchParams({ q: '林宥嘉', platform: 'youtube', tag: '抒情', sort: 'oldest' }),
    ).toMatchObject({
      q: '林宥嘉',
      platform: 'youtube',
      tag: '抒情',
      sort: 'oldest',
    })
  })

  it('忽略不合法的 platform', () => {
    expect(parseSearchParams({ platform: 'spotify' }).platform).toBeUndefined()
  })

  it('cursor 轉成 offset', () => {
    expect(parseSearchParams({ cursor: '40' }).offset).toBe(40)
  })

  it('忽略不合法 cursor', () => {
    expect(parseSearchParams({ cursor: 'abc' }).offset).toBe(0)
    expect(parseSearchParams({ cursor: '-5' }).offset).toBe(0)
  })
})

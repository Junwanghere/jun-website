import { describe, it, expect } from 'vitest'
import { parseSearchParams } from '@/lib/covers/search-params'

describe('parseSearchParams', () => {
  it('沒有參數時用預設值（每頁 10 筆、offset 0）', () => {
    expect(parseSearchParams({})).toEqual({
      q: undefined,
      artist: undefined,
      tag: undefined,
      sort: 'newest',
      limit: 10,
      offset: 0,
    })
  })

  it('解析 q / artist / tag / sort', () => {
    expect(
      parseSearchParams({ q: '林宥嘉', artist: '林宥嘉', tag: '抒情', sort: 'oldest' }),
    ).toMatchObject({
      q: '林宥嘉',
      artist: '林宥嘉',
      tag: '抒情',
      sort: 'oldest',
    })
  })

  it('artist 接受任意字串（白名單由 UI 控制，server 不擋）', () => {
    expect(parseSearchParams({ artist: '完全沒這個人' }).artist).toBe('完全沒這個人')
  })

  it('空字串 artist 視為 undefined', () => {
    expect(parseSearchParams({ artist: '' }).artist).toBeUndefined()
  })

  it('offset 永遠為 0（分頁改由客戶端累加，cursor 不再進 URL）', () => {
    expect(parseSearchParams({}).offset).toBe(0)
    expect(parseSearchParams({ cursor: '40' }).offset).toBe(0)
  })
})

import { describe, it, expect } from 'vitest'
import { selectNewEntries, type FeedEntry } from '@/lib/youtube/rss'

const entries: FeedEntry[] = [
  { videoId: 'aaa', title: 'A', published: '2026-06-13T00:00:00+00:00' },
  { videoId: 'bbb', title: 'B', published: '2026-06-12T00:00:00+00:00' },
  { videoId: 'ccc', title: 'C', published: '2026-06-11T00:00:00+00:00' },
]

describe('selectNewEntries', () => {
  it('過濾掉已收錄的 videoId', () => {
    expect(selectNewEntries(entries, new Set(['bbb']))).toEqual([
      { videoId: 'aaa', title: 'A', published: '2026-06-13T00:00:00+00:00' },
      { videoId: 'ccc', title: 'C', published: '2026-06-11T00:00:00+00:00' },
    ])
  })

  it('全部已收錄時回空陣列', () => {
    expect(selectNewEntries(entries, new Set(['aaa', 'bbb', 'ccc']))).toEqual([])
  })
})

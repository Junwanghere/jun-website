import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ loadMore: vi.fn() }))
vi.mock('@/lib/covers/actions', () => ({
  loadMoreCovers: h.loadMore,
}))

import { CoverList } from '@/components/cover-list'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

function makeCover(id: string): CoverWithLinks {
  return {
    id,
    title: `歌-${id}`,
    original_artist: '原唱',
    cover_date: '2026-01-01',
    status: 'published',
    thumbnail_url: null,
    description: null,
    tags: [],
    created_at: '',
    updated_at: '',
    cover_links: [],
  }
}

const baseQuery: CoverQuery = {
  q: undefined,
  artist: undefined,
  tag: undefined,
  sort: 'newest',
  limit: 10,
  offset: 0,
}

describe('CoverList', () => {
  beforeEach(() => h.loadMore.mockReset())

  it('items 少於 total 時顯示「載入更多」', () => {
    render(
      <CoverList initialItems={[makeCover('1'), makeCover('2')]} total={4} baseQuery={baseQuery} />,
    )
    expect(screen.getByRole('button', { name: '載入更多' })).toBeInTheDocument()
  })

  it('initialItems 已達 total 時不顯示按鈕', () => {
    render(<CoverList initialItems={[makeCover('1')]} total={1} baseQuery={baseQuery} />)
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  })

  it('點「載入更多」用 offset=已顯示數 呼叫 action，append 後達 total 則按鈕消失', async () => {
    h.loadMore.mockResolvedValue([makeCover('3'), makeCover('4')])
    render(
      <CoverList initialItems={[makeCover('1'), makeCover('2')]} total={4} baseQuery={baseQuery} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '載入更多' }))

    expect(await screen.findByText(/歌-3/)).toBeInTheDocument()
    expect(screen.getByText(/歌-4/)).toBeInTheDocument()
    expect(h.loadMore).toHaveBeenCalledWith({ ...baseQuery, offset: 2 })
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  })
})

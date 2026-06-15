import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CoverCard } from '@/components/cover-card'
import type { CoverWithLinks } from '@/lib/covers/types'

const cover: CoverWithLinks = {
  id: 'abc',
  title: '台北某個地方',
  original_artist: '陳綺貞',
  cover_date: '2026-05-25',
  status: 'published',
  thumbnail_url: null,
  description: null,
  tags: [],
  created_at: '',
  updated_at: '',
  cover_links: [],
}

describe('CoverCard', () => {
  it('歌名以 〈〉 呈現，且連結到詳情頁', () => {
    render(<CoverCard cover={cover} />)
    const link = screen.getByRole('link', { name: '〈台北某個地方〉' })
    expect(link).toHaveAttribute('href', '/covers/abc')
  })
})

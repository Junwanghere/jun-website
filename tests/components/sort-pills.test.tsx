import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ push: vi.fn(), params: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push }),
  useSearchParams: () => new URLSearchParams(h.params),
}))

import { SortPills } from '@/components/sort-pills'

describe('SortPills', () => {
  beforeEach(() => {
    h.push.mockClear()
    h.params = ''
  })

  it('sort=newest 時「最新」為 active', () => {
    render(<SortPills active="newest" />)
    expect(screen.getByRole('button', { name: '最新' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '最舊' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('點「最舊」帶 sort=oldest 並清掉 cursor', async () => {
    h.params = 'cursor=20'
    render(<SortPills active="newest" />)
    await userEvent.click(screen.getByRole('button', { name: '最舊' }))
    expect(h.push).toHaveBeenCalledWith('/covers?sort=oldest')
  })

  it('點「最新」移除 sort 參數', async () => {
    h.params = 'sort=oldest'
    render(<SortPills active="oldest" />)
    await userEvent.click(screen.getByRole('button', { name: '最新' }))
    expect(h.push).toHaveBeenCalledWith('/covers?')
  })
})

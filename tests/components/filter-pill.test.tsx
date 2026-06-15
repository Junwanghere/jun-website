import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FilterPill } from '@/components/filter-pill'

describe('FilterPill', () => {
  it('active 時 aria-pressed 為 true', () => {
    render(<FilterPill label="最新" active onClick={() => {}} />)
    expect(screen.getByRole('button', { name: '最新' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('點擊觸發 onClick', async () => {
    const onClick = vi.fn()
    render(<FilterPill label="最舊" active={false} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: '最舊' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

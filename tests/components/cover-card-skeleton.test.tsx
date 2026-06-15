import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CoverGridSkeleton } from '@/components/cover-card-skeleton'

describe('CoverGridSkeleton', () => {
  it('渲染指定數量的骨架卡', () => {
    render(<CoverGridSkeleton count={3} />)
    expect(screen.getByTestId('cover-grid-skeleton').children).toHaveLength(3)
  })
})

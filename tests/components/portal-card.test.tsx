import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PortalCard } from '@/components/portal-card'

describe('PortalCard', () => {
  it('顯示 label、title、description、且是連結到 href', () => {
    render(
      <PortalCard href="/covers" label="COVERS" title="127 首翻唱" description="最新：交換餘生" />,
    )
    const link = screen.getByRole('link', { name: /127 首翻唱/ })
    expect(link).toHaveAttribute('href', '/covers')
    expect(screen.getByText('COVERS')).toBeInTheDocument()
    expect(screen.getByText('最新：交換餘生')).toBeInTheDocument()
  })

  it('featured 變體顯示為實心主色背景', () => {
    render(<PortalCard href="/covers" label="X" title="Y" featured />)
    const link = screen.getByRole('link')
    expect(link.className).toMatch(/bg-primary/)
  })
})

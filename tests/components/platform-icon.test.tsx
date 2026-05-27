import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PlatformIcon } from '@/components/platform-icon'

describe('PlatformIcon', () => {
  it.each([
    ['youtube', 'YouTube'],
    ['instagram', 'Instagram'],
    ['threads', 'Threads'],
    ['tiktok', 'TikTok'],
    ['xiaohongshu', '小紅書'],
    ['other', '其他'],
  ] as const)('platform=%s 渲染 aria-label %s', (platform, label) => {
    render(<PlatformIcon platform={platform} />)
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  })

  it('platform=other 時 label prop 覆寫 aria-label', () => {
    render(<PlatformIcon platform="other" label="StreetVoice" />)
    expect(screen.getByLabelText('StreetVoice')).toBeInTheDocument()
    expect(screen.queryByLabelText('其他')).not.toBeInTheDocument()
  })

  it('Instagram 渲染 SVG 包含漸層 fill 引用', () => {
    const { container } = render(<PlatformIcon platform="instagram" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.innerHTML).toContain('url(#') // linearGradient fill reference
  })

  it('TikTok 渲染三層 SVG 達成 chromatic aberration', () => {
    const { container } = render(<PlatformIcon platform="tiktok" />)
    // wrapper 內含 3 個 svg 元素（青、紅、黑）
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(3)
  })
})

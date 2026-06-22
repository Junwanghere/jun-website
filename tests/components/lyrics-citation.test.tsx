import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LyricsCitation } from '@/components/lyrics-citation'

describe('LyricsCitation', () => {
  it('歌詞以 aria-label 提供完整內容，並呈現出處', () => {
    // 歌詞由 typed.js 於 client 端逐字輸入，初始 DOM 文字為空；
    // 完整歌詞透過 span 的 aria-label 提供（無障礙）。
    const { container } = render(
      <LyricsCitation lyrics={'第一句\n第二句'} attribution="醉後喜歡我 - 冰球樂團" />,
    )
    expect(container.querySelector('[aria-label]')).toHaveAttribute('aria-label', '第一句\n第二句')
    expect(screen.getByText('醉後喜歡我 - 冰球樂團')).toBeInTheDocument()
  })
})

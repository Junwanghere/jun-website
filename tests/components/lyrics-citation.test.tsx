import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LyricsCitation } from '@/components/lyrics-citation'

describe('LyricsCitation', () => {
  it('呈現歌詞與出處', () => {
    render(<LyricsCitation lyrics={'第一句\n第二句'} attribution="醉後喜歡我 - 冰球樂團" />)
    expect(screen.getByText(/第一句/)).toBeInTheDocument()
    expect(screen.getByText('醉後喜歡我 - 冰球樂團')).toBeInTheDocument()
  })
})

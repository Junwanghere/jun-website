import { describe, it, expect } from 'vitest'
import { parseChannelFeed } from '@/lib/youtube/rss'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>頻道標題（不該被當成影片）</title>
  <entry>
    <yt:videoId>mDnelt8J_rc</yt:videoId>
    <title>〈不想和你分開〉- 椅子樂團 （Cover by Jun)</title>
    <published>2026-06-13T10:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>zuKanT80y7M</yt:videoId>
    <title>〈梅雨季〉- 張震嶽 (Cover by Jun)</title>
    <published>2026-06-08T09:30:00+00:00</published>
  </entry>
</feed>`

describe('parseChannelFeed', () => {
  it('取出每個 entry 的 videoId / title / published', () => {
    expect(parseChannelFeed(SAMPLE)).toEqual([
      {
        videoId: 'mDnelt8J_rc',
        title: '〈不想和你分開〉- 椅子樂團 （Cover by Jun)',
        published: '2026-06-13T10:00:00+00:00',
      },
      {
        videoId: 'zuKanT80y7M',
        title: '〈梅雨季〉- 張震嶽 (Cover by Jun)',
        published: '2026-06-08T09:30:00+00:00',
      },
    ])
  })

  it('沒有 entry 時回空陣列', () => {
    expect(parseChannelFeed('<feed><title>空頻道</title></feed>')).toEqual([])
  })
})

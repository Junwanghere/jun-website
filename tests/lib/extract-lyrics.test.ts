import { describe, it, expect } from 'vitest'
import { extractLyrics } from '@/lib/youtube/rss'

describe('extractLyrics', () => {
  it('砍掉〈〉標題行與結尾 hashtag，留中間歌詞', () => {
    const desc = ['〈醉後喜歡我〉- 冰球樂團', 'Maybe we should take it slow', '我害怕會犯錯', '#醉後喜歡我 #冰球樂團 #翻唱'].join('\n')
    expect(extractLyrics(desc, '〈醉後喜歡我〉- 冰球樂團(Cover by Jun)')).toBe(
      ['Maybe we should take it slow', '我害怕會犯錯'].join('\n'),
    )
  })

  it('開頭非〈〉但吻合影片標題 → 一樣砍掉', () => {
    const desc = ['Last Summer (月亮惹的禍)- 我是機車少女', 'I just wanna feel alright', 'In and out again', '#lastsummer #月亮惹的禍 #翻唱'].join('\n')
    expect(extractLyrics(desc, 'Last Summer (月亮惹的禍) - 我是機車少女 (Cover by Jun')).toBe(
      ['I just wanna feel alright', 'In and out again'].join('\n'),
    )
  })

  it('開頭那行就是歌詞（不吻合標題）→ 保留，只砍結尾空行+hashtag', () => {
    const desc = ['夏天就要來臨 梅雨即將離去', '我們都已長大了 就再也回不去', '', '#梅雨季 #張震嶽 #翻唱'].join('\n')
    expect(extractLyrics(desc, '〈梅雨季〉- 張震嶽 (Cover by Jun)')).toBe(
      ['夏天就要來臨 梅雨即將離去', '我們都已長大了 就再也回不去'].join('\n'),
    )
  })

  it('歌詞與 hashtag 之間夾空行也能處理', () => {
    const desc = ['〈seasons〉- wave to earth', "But I'll pray for you all the time", 'my seasons', '', '#wavetoearth #seasons #翻唱'].join('\n')
    expect(extractLyrics(desc, '〈seasons〉- wave to earth (Cover by Jun)')).toBe(
      ["But I'll pray for you all the time", 'my seasons'].join('\n'),
    )
  })

  it('只有標題+hashtag、沒有歌詞 → 回空字串', () => {
    const desc = ['〈某歌〉- 某人', '#某歌 #翻唱'].join('\n')
    expect(extractLyrics(desc, '〈某歌〉- 某人 (Cover by Jun)')).toBe('')
  })

  it('混了文字的行不算 hashtag 行，會保留', () => {
    const desc = ['〈某歌〉- 某人', '副歌 #翻唱', '#某歌 #翻唱'].join('\n')
    expect(extractLyrics(desc, '〈某歌〉- 某人 (Cover by Jun)')).toBe('副歌 #翻唱')
  })

  it('空描述 → 空字串', () => {
    expect(extractLyrics('', '〈某歌〉- 某人')).toBe('')
  })
})

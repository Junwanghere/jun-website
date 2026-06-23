'use client'

import { useEffect, useRef } from 'react'
import Typed from 'typed.js'

// ▼▼▼ 可自由手調的 typed.js 參數（改完存檔即可看效果） ▼▼▼
const TYPED_OPTIONS = {
  typeSpeed: 35, // 每字間隔(ms)，越小越快
  startDelay: 250, // 開始前延遲(ms)
  showCursor: true, // 顯示游標
  cursorChar: '|', // 游標字元
  loop: false, // 是否循環播放
  smartBackspace: false,
} as const
// ▲▲▲ 可自由手調的 typed.js 參數 ▲▲▲

// 歌詞 citation 卡片：引文以 typed.js 打字呈現，出處靜態置中。
export function LyricsCitation({ lyrics, attribution }: { lyrics: string; attribution: string }) {
  const el = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!el.current) return
    const typed = new Typed(el.current, {
      strings: [lyrics.replace(/\n/g, '<br>')], // 換行 → <br>
      ...TYPED_OPTIONS,
    })
    return () => typed.destroy()
  }, [lyrics])

  return (
    <div className="bg-card rounded-[20px] px-8 pt-7 pb-[22px] shadow-sm">
      <div className="relative mx-auto max-w-[30ch] text-left">
        {/* 佔位：完整歌詞，隱形但撐出最終高度。讓卡片不會隨打字長高（避免 CLS），
            同時把歌詞放進 SSR HTML（利於 SEO）。 */}
        <p className="invisible text-base leading-[1.75] whitespace-pre-line">{lyrics}</p>
        {/* 實際打字內容，絕對疊在佔位上；游標也在絕對層，不影響版面 */}
        <p className="text-card-foreground absolute inset-0 text-base leading-[1.75]">
          {/* aria-label 讓螢幕報讀器一次拿到完整歌詞，不必逐字 */}
          <span ref={el} aria-label={lyrics} />
        </p>
      </div>
      <p className="text-muted-foreground mt-[22px] text-center text-xs font-bold tracking-[0.12em] uppercase">
        {attribution}
      </p>
    </div>
  )
}

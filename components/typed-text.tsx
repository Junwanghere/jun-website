'use client'

import { useEffect, useRef } from 'react'
import Typed from 'typed.js'

// ▼▼▼ 可自由手調的 typed.js 參數（首頁標語用，獨立於歌詞那組） ▼▼▼
const TYPED_OPTIONS = {
  typeSpeed: 100, // 每字間隔(ms)，越小越快
  startDelay: 1400, // 開始前延遲(ms)
  showCursor: true, // 顯示游標
  cursorChar: '|', // 游標字元
  loop: false, // 是否循環播放
  smartBackspace: false,
} as const
// ▲▲▲ 可自由手調的 typed.js 參數 ▲▲▲

// 通用 typed.js 打字文字：把一段文字以打字效果呈現。
export function TypedText({ text, className }: { text: string; className?: string }) {
  const el = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!el.current) return
    const typed = new Typed(el.current, {
      strings: [text.replace(/\n/g, '<br>')],
      ...TYPED_OPTIONS,
    })
    return () => typed.destroy()
  }, [text])

  // aria-label 讓報讀器一次拿到完整文字
  return <span ref={el} aria-label={text} className={className} />
}

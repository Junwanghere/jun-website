'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/lib/prefers-reduced-motion'

// ▼▼▼ 可自由手調的翻轉參數 ▼▼▼
const ENTRANCE_DURATION_MS = 1500 // 進場旋轉時長(ms)
const ENTRANCE_TURNS = 4 // 進場自動轉幾圈
// 進場緩動：慢快慢（兩端慢、中間快）。easeInOutCubic；要更戲劇化換 0.83,0,0.17,1（easeInOutQuint）
const ENTRANCE_EASING = 'cubic-bezier(0.50, 0.18, 0.29, 0.81)'

const CLICK_DURATION_MS = 500 // 手點翻面時長(ms)
const CLICK_EASING = 'linear' // 手點：等速
// ▲▲▲ 可自由手調的翻轉參數 ▲▲▲

const BACK_SRC = '/jun-profile-back.jpg'

const ENTRANCE_TRANSITION = `transform ${ENTRANCE_DURATION_MS}ms ${ENTRANCE_EASING}`
const CLICK_TRANSITION = `transform ${CLICK_DURATION_MS}ms ${CLICK_EASING}`

// 首頁頭像硬幣翻轉：純 CSS 3D（rotateY + preserve-3d + backface-hidden）。
// 進場自動轉 ENTRANCE_TURNS 圈停在正面（慢快慢）；點擊每次再翻 180°（等速、較短）。
// 尊重 prefers-reduced-motion。
export function CoinFlipAvatar() {
  // 初始停在「進場前」的角度（-360×圈數，仍是正面，SSR 不會閃到背面）
  const [rot, setRot] = useState(-360 * ENTRANCE_TURNS)
  const [animate, setAnimate] = useState(true)
  const [transition, setTransition] = useState(ENTRANCE_TRANSITION)
  const [ready, setReady] = useState(false) // 進場結束才開放點擊翻面

  useEffect(() => {
    const reduce = prefersReducedMotion()
    // 下一幀才改角度：非 reduced 觸發 transition 轉進場；reduced 則關 transition 直接定位
    const raf = requestAnimationFrame(() => {
      if (reduce) setAnimate(false)
      setRot(0)
    })
    // 進場動畫結束（reduced 則立即）才開放點擊，避免動畫途中插斷造成爆衝
    const timer = setTimeout(() => setReady(true), reduce ? 0 : ENTRANCE_DURATION_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={() => {
        if (!ready) return // 進場動畫途中忽略點擊
        setTransition(CLICK_TRANSITION) // 手點：等速、較短
        setRot((r) => r + 180)
      }}
      aria-label="翻轉頭像"
      className="focus-visible:ring-ring relative mx-auto block size-20 cursor-pointer rounded-full [perspective:1000px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div
        className="relative size-full rounded-full [transform-style:preserve-3d]"
        style={{
          transform: `rotateY(${rot}deg)`,
          transition: animate ? transition : 'none',
        }}
      >
        {/* 正面 */}
        <span className="absolute inset-0 overflow-hidden rounded-full shadow-md [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
          <Image src="/jun-profile.jpg" alt="王嘉駿" fill sizes="80px" className="object-cover" priority />
        </span>
        {/* 背面（預先轉 180° 擺好） */}
        <span className="absolute inset-0 overflow-hidden rounded-full shadow-md [transform:rotateY(180deg)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
          {/* 臉偏上，object-position 往上對焦避免裁到下巴 */}
          <Image
            src={BACK_SRC}
            alt="王嘉駿 背面"
            fill
            sizes="80px"
            priority
            className="object-cover object-[center_32%]"
          />
        </span>
      </div>
    </button>
  )
}

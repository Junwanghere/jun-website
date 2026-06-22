'use client'

import { useRef } from 'react'

const MAX_TILT = 9 // 最大傾斜角度（度）

// 歌詞 citation 卡片：引文置中靠左、出處置中，加上滑鼠 3D tilt + 光澤。
// tilt 只在滑鼠裝置上啟用，並尊重 prefers-reduced-motion。
export function LyricsCitation({ lyrics, attribution }: { lyrics: string; attribution: string }) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const ry = (x - 0.5) * 2 * MAX_TILT
    const rx = -(y - 0.5) * 2 * MAX_TILT
    el.style.transition = 'transform .05s linear, box-shadow .25s ease'
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform .4s ease, box-shadow .25s ease'
    el.style.transform = 'rotateX(0) rotateY(0) scale(1)'
  }

  return (
    <div className="[perspective:900px]">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="bg-card group relative rounded-[20px] px-8 pt-7 pb-[22px] shadow-sm transition-[transform,box-shadow] duration-200 will-change-transform [transform-style:preserve-3d] hover:shadow-[0_18px_40px_-12px_rgba(58,56,53,0.28)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)',
          }}
        />
        <div className="mx-auto max-w-[30ch] text-left [transform:translateZ(28px)]">
          <p className="text-card-foreground text-base leading-[1.75] whitespace-pre-line">
            {lyrics}
          </p>
        </div>
        <p className="text-muted-foreground mt-[22px] text-center text-xs font-bold tracking-[0.12em] uppercase [transform:translateZ(18px)]">
          {attribution}
        </p>
      </div>
    </div>
  )
}

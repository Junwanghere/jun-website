'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/prefers-reduced-motion'

// 通用 3D tilt 包裝層：滑鼠移動時依游標位置傾斜，離開回正。
// 只在滑鼠裝置啟用，並尊重 prefers-reduced-motion。把要傾斜的卡片內容當 children 傳入。
export function Tilt({
  children,
  className,
  max = 8,
  scale = 1.02,
}: {
  children: React.ReactNode
  className?: string
  max?: number
  scale?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    if (prefersReducedMotion()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.transition = 'transform .05s linear, box-shadow .25s ease'
    el.style.transform = `rotateX(${-(y - 0.5) * 2 * max}deg) rotateY(${(x - 0.5) * 2 * max}deg) scale(${scale})`
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
        className={cn('will-change-transform [transform-style:preserve-3d]', className)}
      >
        {children}
      </div>
    </div>
  )
}

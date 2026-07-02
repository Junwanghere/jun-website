'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { prefersReducedMotion } from '@/lib/prefers-reduced-motion'
import type { EraPhoto } from './eras'

// ▼▼▼ 可自由手調的輪播參數 ▼▼▼
const AUTOPLAY_MS = 4000 // 自動輪播間隔(ms)
const RESUME_AFTER_TOUCH_MS = 6000 // 觸控操作後多久恢復自動輪播(ms)
// ▲▲▲ 可自由手調的輪播參數 ▲▲▲

// 圖片相框（單張也共用，避免重複 markup / sizes）
export const PHOTO_SIZES = '(min-width: 768px) 40vw, 90vw'

// 照片相框：單張直接顯示；多張啟用 scrollsnap carousel + 自動輪播。
// 桌機 hover 顯示左右箭頭、底部圓點指示；hover／鍵盤焦點／觸控／不在畫面內時暫停，並尊重減少動態偏好。
export function PhotoCarousel({ photos, priority }: { photos: EraPhoto[]; priority?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const resumeTimer = useRef<number | null>(null)
  const [active, setActive] = useState(0)

  const [paused, setPaused] = useState(false) // 滑鼠 hover 或鍵盤焦點
  const [touchHold, setTouchHold] = useState(false) // 觸控操作中
  const [inView, setInView] = useState(false)

  const multi = photos.length > 1

  const goTo = (i: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(photos.length - 1, i))
    track.scrollTo({ left: track.clientWidth * clamped, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const idx = Math.round(track.scrollLeft / track.clientWidth)
    activeRef.current = idx
    setActive(idx)
  }

  // 進入視窗才輪播（離開就停）
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.4,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 自動輪播
  useEffect(() => {
    if (!multi) return
    if (prefersReducedMotion()) return
    if (paused || touchHold || !inView) return

    const id = window.setInterval(() => {
      if (document.hidden) return
      const track = trackRef.current
      if (!track) return
      const next = (activeRef.current + 1) % photos.length
      track.scrollTo({ left: track.clientWidth * next, behavior: 'smooth' })
    }, AUTOPLAY_MS)

    return () => window.clearInterval(id)
  }, [multi, photos.length, paused, touchHold, inView])

  useEffect(() => () => window.clearTimeout(resumeTimer.current ?? undefined), [])

  // 滑鼠 hover 暫停（只認 mouse，避免觸控合成的 mouseenter 卡住 paused）
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') setPaused(true)
  }
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') setPaused(false)
  }
  // 觸控：按下暫停，放開後過一段時間才恢復（避免剛滑完馬上被搶走）
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    setTouchHold(true)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    resumeTimer.current = window.setTimeout(() => setTouchHold(false), RESUME_AFTER_TOUCH_MS)
  }

  if (!photos.length) return null

  const arrowBase =
    'absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:!opacity-0'

  return (
    <div
      ref={rootRef}
      className="group bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-sm"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-proximity overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <div key={p.src} className="relative h-full w-full flex-shrink-0 snap-center">
            <Image
              src={p.src}
              alt={p.alt}
              fill
              priority={priority && i === 0}
              sizes={PHOTO_SIZES}
              className={'object-cover ' + (p.position ?? '')}
            />
          </div>
        ))}
      </div>

      {/* 左右箭頭：桌機 hover 才出現；頭/尾停用（不卸載，避免焦點消失導致 paused 卡住） */}
      {multi && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="上一張"
            className={arrowBase + ' left-2'}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === photos.length - 1}
            aria-label="下一張"
            className={arrowBase + ' right-2'}
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* 圓點指示 */}
      {multi && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`第 ${i + 1} 張`}
              className={
                'h-1.5 rounded-full transition-all ' +
                (i === active ? 'w-4 bg-white' : 'w-1.5 bg-white/50')
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

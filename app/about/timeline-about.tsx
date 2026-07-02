'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ERAS } from './eras'
import { EraLinks } from './era-links'
import { PhotoCarousel } from './photo-carousel'
import { SpotifyEmbed } from '@/components/spotify-embed'
import { prefersReducedMotion } from '@/lib/prefers-reduced-motion'

// SSR 沒有 layout 階段；client 用 useLayoutEffect 才能在 paint 前設好初始狀態，避免閃爍。
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function TimelineAbout() {
  const root = useRef<HTMLDivElement>(null)

  // 在 paint 前設定 reveal 的起始狀態，避免上方內容先顯示再被設成透明而閃一下。
  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) return
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      // 每個 .reveal 進入視窗時淡入 + 上移
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 48,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 82%' },
        })
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <header className="reveal mb-10 text-center md:mb-24">
        <p className="text-primary text-xs font-semibold tracking-[0.35em]">ABOUT JUN</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">關於王嘉駿</h1>
        <p className="text-muted-foreground mt-4">王嘉駿的唱歌歷史考古。</p>
      </header>

      <div className="relative">
        {/* 時間軸中線：手機在左側，桌機置中 */}
        <div
          className="bg-border absolute top-0 left-4 h-full w-px md:left-1/2 md:-translate-x-1/2"
          aria-hidden
        />

        <div className="space-y-14 md:space-y-32">
          {ERAS.map((era, i) => (
            <section key={era.id} className="reveal relative pl-12 md:pl-0">
              {/* 節點圓點 */}
              <span
                className="bg-primary ring-background absolute top-1.5 left-4 z-10 size-3 -translate-x-1/2 rounded-full ring-4 md:left-1/2"
                aria-hidden
              />

              <div
                className={
                  'md:flex md:items-center md:gap-12 ' + (i % 2 ? 'md:flex-row-reverse' : '')
                }
              >
                <div className="md:w-1/2">
                  <PhotoCarousel photos={era.photos} priority={i === 0} />
                </div>

                <div className="mt-8 md:mt-0 md:w-1/2">
                  <p className="text-primary text-xs font-semibold tracking-[0.25em]">
                    {era.period}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                    {era.title}
                  </h2>
                  <div className="text-muted-foreground mt-3 space-y-2 leading-relaxed">
                    {era.body.map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                  {era.note && (
                    <p className="border-border text-muted-foreground/70 mt-4 border-l-2 pl-3 text-sm leading-relaxed">
                      <span className="text-muted-foreground/50">備註 · </span>
                      {era.note}
                    </p>
                  )}
                  <EraLinks era={era} />
                  {era.spotifyArtist && (
                    <div className="mt-5">
                      <SpotifyEmbed artistId={era.spotifyArtist} title={`${era.title} 的 Spotify`} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="text-muted-foreground/70 mt-24 text-center text-xs">
        © 2026 王嘉駿
      </footer>
    </div>
  )
}

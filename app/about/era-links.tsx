import Link from 'next/link'
import { SiInstagram, SiThreads, SiYoutube } from 'react-icons/si'
import { Music4 } from 'lucide-react'
import type { Era, EraLink } from './eras'

function LinkIcon({ kind }: { kind: EraLink['kind'] }) {
  const cls = 'size-4'
  if (kind === 'youtube') return <SiYoutube className={cls} />
  if (kind === 'instagram') return <SiInstagram className={cls} />
  if (kind === 'threads') return <SiThreads className={cls} />
  return <Music4 className={cls} /> // covers / streetvoice
}

// 各時期底部的連結列（作品、社群）。
export function EraLinks({ era, tone = 'light' }: { era: Era; tone?: 'light' | 'dark' }) {
  if (!era.links?.length) return null

  const chip =
    tone === 'dark'
      ? 'border-white/25 text-white hover:bg-white/10'
      : 'border-border text-foreground hover:bg-secondary'

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {era.links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          target={l.href.startsWith('http') ? '_blank' : undefined}
          rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${chip}`}
        >
          <LinkIcon kind={l.kind} />
          {l.label}
        </Link>
      ))}
    </div>
  )
}

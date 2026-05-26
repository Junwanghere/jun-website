import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PLATFORM_LABEL, type CoverWithLinks, type Platform } from '@/lib/covers/types'

const PLATFORM_SHORT: Record<Platform, string> = {
  youtube: 'YT',
  instagram: 'IG',
  threads: 'TH',
  other: '其他',
}

function platformPillClass(platform: Platform) {
  return cn(
    'rounded-full px-2 py-[2px] text-[10px] font-bold',
    platform === 'youtube' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
  )
}

export function CoverCard({ cover }: { cover: CoverWithLinks }) {
  return (
    <Link
      href={`/covers/${cover.id}`}
      className="flex gap-3 rounded-2xl bg-card p-3 shadow-sm transition hover:shadow-md"
    >
      <div
        className="size-[60px] shrink-0 rounded-xl bg-muted"
        style={
          cover.thumbnail_url
            ? { background: `center/cover no-repeat url('${cover.thumbnail_url}')` }
            : undefined
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-card-foreground">{cover.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          原唱 {cover.original_artist} · {cover.cover_date}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {cover.cover_links.map((l) => (
            <span
              key={l.id}
              className={platformPillClass(l.platform)}
              title={PLATFORM_LABEL[l.platform]}
            >
              {PLATFORM_SHORT[l.platform]}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

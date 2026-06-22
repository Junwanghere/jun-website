import Link from 'next/link'
import { PlatformIcon } from '@/components/platform-icon'
import { PLATFORM_LABEL, type CoverWithLinks } from '@/lib/covers/types'
import { formatSongTitle } from '@/lib/covers/format'

export function CoverCard({ cover }: { cover: CoverWithLinks }) {
  return (
    <article className="bg-card relative flex gap-3 rounded-2xl p-3 shadow-sm transition hover:shadow-md md:flex-col md:gap-2">
      <div
        className="bg-muted aspect-video w-32 shrink-0 rounded-xl md:w-full"
        style={
          cover.thumbnail_url
            ? { background: `center/cover no-repeat url('${cover.thumbnail_url}')` }
            : undefined
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-card-foreground truncate text-base font-bold">
          <Link
            href={`/covers/${cover.id}`}
            className="focus-visible:ring-ring rounded after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:outline-none"
          >
            {formatSongTitle(cover.title)}
          </Link>
        </h3>
        <div className="text-muted-foreground truncate text-xs">
          {cover.original_artist} · {cover.cover_date}
        </div>
        <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1.5">
          {cover.cover_links.map((l) => {
            const ariaName =
              l.platform === 'other' && l.platform_label
                ? l.platform_label
                : PLATFORM_LABEL[l.platform]
            return (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`在 ${ariaName} 觀看`}
                className="focus-visible:ring-ring inline-flex items-center rounded transition hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
              >
                <PlatformIcon platform={l.platform} label={l.platform_label} />
              </a>
            )
          })}
        </div>
      </div>
    </article>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCoverById } from '@/lib/covers/queries'
import { PLATFORM_LABEL, type Platform } from '@/lib/covers/types'
import { extractYouTubeId } from '@/lib/youtube'
import { formatSongTitle } from '@/lib/covers/format'
import { LyricsCitation } from '@/components/lyrics-citation'
import { PlatformIcon } from '@/components/platform-icon'

export const dynamic = 'force-dynamic'

export default async function CoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cover = await getCoverById(id)
  if (!cover) notFound()

  const youtubeLink = cover.cover_links.find((l) => l.platform === 'youtube')
  const youtubeId = youtubeLink ? extractYouTubeId(youtubeLink.url) : null

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[560px]">
        <Link
          href="/covers"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回翻唱列表
        </Link>

        <article className="mt-4">
          <h1 className="text-2xl font-bold">{formatSongTitle(cover.title)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {cover.original_artist} · {cover.cover_date}
          </p>

          {youtubeId && (
            <div className="bg-muted mt-4 aspect-video overflow-hidden rounded-2xl">
              <iframe
                className="size-full"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={`${formatSongTitle(cover.title)} 翻唱`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {cover.cover_links.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="text-muted-foreground shrink-0 text-sm">觀看平台：</span>
              {cover.cover_links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`在 ${
                    l.platform === 'other' && l.platform_label
                      ? l.platform_label
                      : PLATFORM_LABEL[l.platform as Platform]
                  } 觀看`}
                  className="focus-visible:ring-ring inline-flex items-center rounded transition hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <PlatformIcon platform={l.platform} label={l.platform_label} size={26} />
                </a>
              ))}
            </div>
          )}

          {cover.description && (
            <div className="mt-4">
              <LyricsCitation
                lyrics={cover.description}
                attribution={`${formatSongTitle(cover.title)} - ${cover.original_artist}`}
              />
            </div>
          )}
        </article>
      </div>
    </main>
  )
}

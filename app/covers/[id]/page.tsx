import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getCoverById } from '@/lib/covers/queries'
import { PLATFORM_LABEL, type Platform } from '@/lib/covers/types'
import { extractYouTubeId } from '@/lib/youtube'
import { formatSongTitle } from '@/lib/covers/format'

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

          {cover.description && (
            <p className="text-card-foreground mt-4 text-sm leading-relaxed whitespace-pre-line">
              {cover.description}
            </p>
          )}

          <div className="mt-6 space-y-2">
            <h2 className="text-primary text-xs font-bold tracking-widest uppercase">前往平台</h2>
            <ul className="flex flex-col gap-2">
              {cover.cover_links.map((l) => {
                const label =
                  l.platform === 'other' && l.platform_label
                    ? l.platform_label
                    : PLATFORM_LABEL[l.platform as Platform]
                return (
                  <li key={l.id}>
                    <Link
                      href={l.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="bg-card flex items-center justify-between rounded-xl px-4 py-3 shadow-sm hover:shadow"
                    >
                      <span className="text-sm font-semibold">{label}</span>
                      <ExternalLink className="text-muted-foreground size-4" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </article>
      </div>
    </main>
  )
}

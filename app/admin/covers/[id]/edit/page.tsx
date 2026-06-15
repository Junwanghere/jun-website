import { notFound } from 'next/navigation'
import { CoverForm } from '@/components/admin/cover-form'
import { getCoverById } from '@/lib/covers/queries'

export default async function EditCoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cover = await getCoverById(id, { includeDrafts: true })
  if (!cover) notFound()

  return (
    <div>
      <h1 className="text-xl font-bold">編輯翻唱</h1>
      <p className="text-muted-foreground mb-4 text-sm">{cover.title}</p>
      <CoverForm
        status={cover.status}
        initialValues={{
          id: cover.id,
          title: cover.title,
          original_artist: cover.original_artist,
          cover_date: cover.cover_date,
          description: cover.description,
          tags: cover.tags,
          thumbnail_url: cover.thumbnail_url,
          links: cover.cover_links.map((l) => ({
            platform: l.platform,
            platform_label: l.platform_label,
            url: l.url,
          })),
        }}
      />
    </div>
  )
}

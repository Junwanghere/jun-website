import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { listCovers } from '@/lib/covers/queries'
import type { CoverWithLinks } from '@/lib/covers/types'
import { DeleteButton } from './delete-button'
import { SyncButton } from './sync-button'

export const dynamic = 'force-dynamic'

function CoverRow({ c }: { c: CoverWithLinks }) {
  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <div className="truncate font-semibold">{c.title}</div>
        <div className="text-muted-foreground truncate text-xs">
          {c.original_artist || '（待補原唱）'} · {c.cover_date} · {c.cover_links.length} 個連結
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link href={`/admin/covers/${c.id}/edit`}>
          <Button variant="ghost" size="sm">
            {c.status === 'draft' ? '補資料' : '編輯'}
          </Button>
        </Link>
        <DeleteButton id={c.id} title={c.title} />
      </div>
    </li>
  )
}

export default async function AdminCoversPage() {
  const { items } = await listCovers(
    { sort: 'newest', limit: 200, offset: 0 },
    { includeDrafts: true },
  )
  const drafts = items.filter((c) => c.status === 'draft')
  const published = items.filter((c) => c.status === 'published')

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">翻唱管理</h1>
          <p className="text-muted-foreground text-sm">共 {published.length} 首</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Link href="/admin/covers/new">
            <Button>＋ 新增翻唱</Button>
          </Link>
        </div>
      </div>

      {drafts.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">待補草稿（{drafts.length}）</h2>
          <p className="text-muted-foreground text-xs">
            排程自動抓進來的新片，補上各平台連結後按「發布」。
          </p>
          <ul className="divide-border border-primary/40 bg-card mt-2 divide-y rounded-2xl border">
            {drafts.map((c) => (
              <CoverRow key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}

      <ul className="divide-border border-border bg-card mt-4 divide-y rounded-2xl border">
        {published.map((c) => (
          <CoverRow key={c.id} c={c} />
        ))}
        {published.length === 0 && (
          <li className="text-muted-foreground px-4 py-6 text-center text-sm">
            還沒有已發布的翻唱
          </li>
        )}
      </ul>
    </div>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { listCovers } from '@/lib/covers/queries'
import { DeleteButton } from './delete-button'

export const dynamic = 'force-dynamic'

export default async function AdminCoversPage() {
  const { items, total } = await listCovers({ sort: 'newest', limit: 200, offset: 0 })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">翻唱管理</h1>
          <p className="text-muted-foreground text-sm">共 {total} 首</p>
        </div>
        <Link href="/admin/covers/new">
          <Button>＋ 新增翻唱</Button>
        </Link>
      </div>

      <ul className="divide-border border-border bg-card mt-4 divide-y rounded-2xl border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{c.title}</div>
              <div className="text-muted-foreground truncate text-xs">
                {c.original_artist} · {c.cover_date} · {c.cover_links.length} 個連結
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link href={`/admin/covers/${c.id}/edit`}>
                <Button variant="ghost" size="sm">
                  編輯
                </Button>
              </Link>
              <DeleteButton id={c.id} title={c.title} />
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-muted-foreground px-4 py-6 text-center text-sm">
            還沒有翻唱，點右上新增
          </li>
        )}
      </ul>
    </div>
  )
}

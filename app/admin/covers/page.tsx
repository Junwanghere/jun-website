import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { listCovers } from '@/lib/covers/queries'
import type { CoverWithLinks } from '@/lib/covers/types'
import { DeleteButton } from './delete-button'
import { SyncButton } from './sync-button'
import { CoverSearch } from './cover-search'
import { Pagination } from './pagination'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

type SearchParams = Record<string, string | string[] | undefined>

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
            編輯
          </Button>
        </Link>
        <DeleteButton id={c.id} title={c.title} />
      </div>
    </li>
  )
}

export default async function AdminCoversPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const get = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k])
  const q = get('q') || undefined
  const page = Math.max(1, Number(get('page')) || 1)

  // 草稿：全部撈出、釘最上（不分頁、不受搜尋影響）
  const { items: drafts } = await listCovers(
    { sort: 'newest', limit: 1000, offset: 0 },
    { status: 'draft' },
  )

  // 已發布：搜尋 + 分頁
  const { items: published, total } = await listCovers(
    { q, sort: 'newest', limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    { status: 'published' },
  )
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">翻唱管理</h1>
          <p className="text-muted-foreground text-sm">
            {q ? `符合「${q}」${total} 首` : `共 ${total} 首`}
          </p>
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

      <div className="mt-4 md:max-w-md">
        <CoverSearch defaultValue={q} />
      </div>

      <ul className="divide-border border-border bg-card mt-4 divide-y rounded-2xl border">
        {published.map((c) => (
          <CoverRow key={c.id} c={c} />
        ))}
        {published.length === 0 && (
          <li className="text-muted-foreground px-4 py-6 text-center text-sm">
            {q ? '找不到符合的翻唱' : '還沒有已發布的翻唱'}
          </li>
        )}
      </ul>

      <Pagination currentPage={page} totalPages={totalPages} q={q} />
    </div>
  )
}

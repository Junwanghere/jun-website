import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CoverCard } from '@/components/cover-card'
import { SearchInput } from '@/components/search-input'
import { FilterPills } from '@/components/filter-pills'
import { LoadMoreButton } from '@/components/load-more-button'
import { listCovers } from '@/lib/covers/queries'
import { parseSearchParams } from '@/lib/covers/search-params'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function CoversPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const query = parseSearchParams(params)
  const { items, total, hasMore } = await listCovers(query)

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[480px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> 回首頁
        </Link>

        <div className="mt-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">翻唱</h1>
          <span className="text-sm font-bold text-primary">{total} 首</span>
        </div>

        <div className="mt-3">
          <SearchInput defaultValue={query.q} />
        </div>
        <div className="mt-3">
          <FilterPills active={query.platform} />
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <li className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
              還沒有符合條件的翻唱
            </li>
          ) : (
            items.map((c) => (
              <li key={c.id}>
                <CoverCard cover={c} />
              </li>
            ))
          )}
        </ul>

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <LoadMoreButton currentOffset={query.offset} limit={query.limit} />
          </div>
        )}
      </div>
    </main>
  )
}

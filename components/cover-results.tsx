import { CoverCard } from '@/components/cover-card'
import { LoadMoreButton } from '@/components/load-more-button'
import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery } from '@/lib/covers/types'

export async function CoverResults({ query }: { query: CoverQuery }) {
  const { items, total, hasMore } = await listCovers(query)

  return (
    <>
      <div className="mb-3 flex justify-end">
        <span className="text-primary text-sm font-bold">{total} 首</span>
      </div>

      <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {items.length === 0 ? (
          <li className="bg-card text-muted-foreground rounded-2xl p-6 text-center text-sm md:col-span-2 lg:col-span-3">
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
    </>
  )
}

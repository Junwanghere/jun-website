import { CoverList } from '@/components/cover-list'
import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery } from '@/lib/covers/types'

export async function CoverResults({ query }: { query: CoverQuery }) {
  const { items, total } = await listCovers(query)

  return (
    <>
      <div className="mb-3 flex justify-end">
        <span className="text-primary text-sm font-bold">{total} 首</span>
      </div>
      <CoverList initialItems={items} total={total} baseQuery={query} />
    </>
  )
}

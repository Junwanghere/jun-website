import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CoverCard } from '@/components/cover-card'
import { SearchInput } from '@/components/search-input'
import { ArtistFilterPills } from '@/components/artist-filter-pills'
import { LoadMoreButton } from '@/components/load-more-button'
import { listCovers, getTopOriginalArtists } from '@/lib/covers/queries'
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
  const [{ items, total, hasMore }, topArtists] = await Promise.all([
    listCovers(query),
    getTopOriginalArtists(3),
  ])

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回首頁
        </Link>

        <div className="mt-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">翻唱</h1>
          <span className="text-primary text-sm font-bold">{total} 首</span>
        </div>

        <div className="mt-3 md:max-w-md">
          <SearchInput defaultValue={query.q} />
        </div>
        <div className="mt-3">
          <ArtistFilterPills topArtists={topArtists} active={query.artist} />
        </div>

        <ul className="mt-4 flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
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
      </div>
    </main>
  )
}

import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { SearchInput } from '@/components/search-input'
import { SortPills } from '@/components/sort-pills'
import { ArtistFilterPills } from '@/components/artist-filter-pills'
import { CoverResults } from '@/components/cover-results'
import { CoverGridSkeleton } from '@/components/cover-card-skeleton'
import { getTopOriginalArtists } from '@/lib/covers/queries'
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
  const topArtists = await getTopOriginalArtists(3)
  const suspenseKey = `${query.q ?? ''}|${query.artist ?? ''}|${query.tag ?? ''}|${query.sort}`

  return (
    <main className="min-h-dvh">
      {/* 上方標題區 */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回首頁
        </Link>
        <h1 className="mt-4 text-2xl font-bold">翻唱</h1>
      </div>

      {/* sticky 控制列：搜尋 + 排序 + 原唱 filter */}
      <div className="border-border bg-background sticky top-0 z-20 mt-3 border-b py-3">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="md:max-w-md">
            <SearchInput defaultValue={query.q} />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <SortPills active={query.sort} />
            <ArtistFilterPills topArtists={topArtists} active={query.artist} />
          </div>
        </div>
      </div>

      {/* 結果區：key 隨 q|artist|sort 改變 → 切換時顯示骨架；cursor 不入 key */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        <Suspense key={suspenseKey} fallback={<CoverGridSkeleton count={query.limit} />}>
          <CoverResults query={query} />
        </Suspense>
      </div>
    </main>
  )
}

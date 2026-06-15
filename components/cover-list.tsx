'use client'

import { useState, useTransition } from 'react'
import { CoverCard } from '@/components/cover-card'
import { loadMoreCovers } from '@/lib/covers/actions'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

const GRID = 'flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3'

export function CoverList({
  initialItems,
  total,
  baseQuery,
}: {
  initialItems: CoverWithLinks[]
  total: number
  baseQuery: CoverQuery
}) {
  const [items, setItems] = useState(initialItems)
  const [pending, startTransition] = useTransition()
  const hasMore = items.length < total

  function onLoadMore() {
    startTransition(async () => {
      const next = await loadMoreCovers({ ...baseQuery, offset: items.length })
      setItems((prev) => [...prev, ...next])
    })
  }

  if (items.length === 0) {
    return (
      <ul className={GRID}>
        <li className="bg-card text-muted-foreground rounded-2xl p-6 text-center text-sm md:col-span-2 lg:col-span-3">
          還沒有符合條件的翻唱
        </li>
      </ul>
    )
  }

  return (
    <>
      <ul className={GRID}>
        {items.map((c) => (
          <li key={c.id}>
            <CoverCard cover={c} />
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={pending}
            className="bg-card text-primary rounded-full px-6 py-2.5 text-sm font-bold shadow-sm transition hover:shadow disabled:opacity-60"
          >
            {pending ? '載入中⋯' : '載入更多'}
          </button>
        </div>
      )}
    </>
  )
}

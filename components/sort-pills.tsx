'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterPill } from '@/components/filter-pill'
import type { CoverSort } from '@/lib/covers/types'

export function SortPills({ active }: { active: CoverSort }) {
  const router = useRouter()
  const params = useSearchParams()

  function set(sort: CoverSort) {
    const sp = new URLSearchParams(params)
    if (sort === 'oldest') sp.set('sort', 'oldest')
    else sp.delete('sort')
    sp.delete('cursor')
    router.push(`/covers?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterPill label="最新" active={active === 'newest'} onClick={() => set('newest')} />
      <FilterPill label="最舊" active={active === 'oldest'} onClick={() => set('oldest')} />
    </div>
  )
}

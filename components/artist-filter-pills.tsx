'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterPill } from '@/components/filter-pill'

export function ArtistFilterPills({
  topArtists,
  active,
}: {
  topArtists: string[]
  active?: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  function set(name?: string) {
    const sp = new URLSearchParams(params)
    if (name) sp.set('artist', name)
    else sp.delete('artist')
    sp.delete('cursor')
    router.push(`/covers?${sp.toString()}`)
  }

  if (topArtists.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterPill label="全部" active={!active} onClick={() => set(undefined)} />
      {topArtists.map((name) => (
        <FilterPill key={name} label={name} active={name === active} onClick={() => set(name)} />
      ))}
    </div>
  )
}

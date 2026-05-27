'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

function Pill({
  label,
  current,
  onClick,
}: {
  label: string
  current: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
        current
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground shadow-sm hover:shadow',
      )}
      aria-pressed={current}
    >
      {label}
    </button>
  )
}

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
      <Pill label="全部" current={!active} onClick={() => set(undefined)} />
      {topArtists.map((name) => (
        <Pill key={name} label={name} current={name === active} onClick={() => set(name)} />
      ))}
    </div>
  )
}

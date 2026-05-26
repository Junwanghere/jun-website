'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PLATFORMS, PLATFORM_LABEL, type Platform } from '@/lib/covers/types'

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

export function FilterPills({ active }: { active?: Platform }) {
  const router = useRouter()
  const params = useSearchParams()

  function set(platform?: Platform) {
    const sp = new URLSearchParams(params)
    if (platform) sp.set('platform', platform)
    else sp.delete('platform')
    sp.delete('cursor')
    router.push(`/covers?${sp.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Pill label="全部" current={!active} onClick={() => set(undefined)} />
      {PLATFORMS.map((p) => (
        <Pill key={p} label={PLATFORM_LABEL[p]} current={active === p} onClick={() => set(p)} />
      ))}
    </div>
  )
}

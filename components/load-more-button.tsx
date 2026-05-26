'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function LoadMoreButton({
  currentOffset,
  limit,
}: {
  currentOffset: number
  limit: number
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function onClick() {
    const sp = new URLSearchParams(params)
    sp.set('cursor', String(currentOffset + limit))
    startTransition(() => router.push(`/covers?${sp.toString()}`))
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-full bg-card px-6 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:shadow disabled:opacity-60"
    >
      {pending ? '載入中⋯' : '載入更多'}
    </button>
  )
}

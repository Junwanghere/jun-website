'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(defaultValue ?? '')
  const [, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sp = new URLSearchParams(params)
    if (value) sp.set('q', value)
    else sp.delete('q')
    sp.delete('cursor')
    startTransition(() => router.push(`/covers?${sp.toString()}`))
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜尋歌名或原唱⋯"
        className="w-full rounded-full bg-card py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none ring-0 placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
        aria-label="搜尋"
      />
    </form>
  )
}

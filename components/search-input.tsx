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
      <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜尋歌名或原唱⋯"
        className="bg-card placeholder:text-muted-foreground/70 focus:ring-ring w-full rounded-full py-2.5 pr-4 pl-10 text-sm shadow-sm ring-0 outline-none focus:ring-2"
        aria-label="搜尋"
      />
    </form>
  )
}

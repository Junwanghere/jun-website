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
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜尋歌名或原唱⋯"
        className="bg-card placeholder:text-muted-foreground/70 focus:ring-ring h-11 w-full rounded-full pr-12 pl-5 text-sm shadow-sm ring-0 outline-none focus:ring-2 [&::-webkit-search-cancel-button]:appearance-none"
        aria-label="搜尋"
      />
      <button
        type="submit"
        aria-label="搜尋"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
      >
        <Search className="size-4" />
      </button>
    </form>
  )
}

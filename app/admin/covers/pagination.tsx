import Link from 'next/link'
import { paginationRange } from '@/lib/pagination'

export function Pagination({
  currentPage,
  totalPages,
  q,
}: {
  currentPage: number
  totalPages: number
  q?: string
}) {
  if (totalPages <= 1) return null

  const href = (page: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (page > 1) sp.set('page', String(page))
    const qs = sp.toString()
    return qs ? `/admin/covers?${qs}` : '/admin/covers'
  }

  return (
    <nav className="mt-4 flex items-center justify-center gap-1" aria-label="分頁">
      {paginationRange(currentPage, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`dots-${i}`} className="text-muted-foreground px-2 text-sm">
            …
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            aria-current="page"
            className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className="hover:bg-muted flex size-9 items-center justify-center rounded-full text-sm"
          >
            {p}
          </Link>
        ),
      )}
    </nav>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export function CoverCardSkeleton() {
  return (
    <div className="bg-card flex gap-3 rounded-2xl p-3 shadow-sm md:flex-col md:gap-2">
      <Skeleton className="aspect-video w-32 shrink-0 rounded-xl md:w-full" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function CoverGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <ul
      className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3"
      aria-hidden
      data-testid="cover-grid-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <CoverCardSkeleton />
        </li>
      ))}
    </ul>
  )
}

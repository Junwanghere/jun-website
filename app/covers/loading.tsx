import { CoverGridSkeleton } from '@/components/cover-card-skeleton'

export default function Loading() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        <CoverGridSkeleton />
      </div>
    </main>
  )
}

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CoverGridSkeleton } from '@/components/cover-card-skeleton'

// 路由層載入骨架：結構／高度對齊 app/covers/page.tsx，
// 讓 loading → 實際內容 的切換不會造成版面位移。
export default function Loading() {
  return (
    <main className="min-h-dvh">
      {/* 標題區（靜態，與 page.tsx 相同） */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回首頁
        </Link>
        <h1 className="mt-4 text-2xl font-bold">翻唱</h1>
      </div>

      {/* sticky 控制列佔位：對齊搜尋 + 排序 pill + 原唱 pill 的結構與高度 */}
      <div className="border-border bg-background sticky top-0 z-20 mt-3 border-b py-3">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="md:max-w-md">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-14 rounded-full" />
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-12 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 結果區骨架（「N 首」計數列佔位已內含於 CoverGridSkeleton） */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        <CoverGridSkeleton />
      </div>
    </main>
  )
}

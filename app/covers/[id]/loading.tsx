import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// 詳情頁載入骨架：結構／容器類別／間距對齊 app/covers/[id]/page.tsx，
// 讓 loading → 實際內容 的切換不會造成版面位移。
// 放在本層 [id]/ 是為了覆蓋掉繼承自 app/covers/loading.tsx 的列表骨架。
export default function Loading() {
  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[560px]">
        {/* 返回連結（靜態，與 page.tsx 相同，不需骨架） */}
        <Link
          href="/covers"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> 回翻唱列表
        </Link>

        <article className="mt-4" aria-hidden>
          {/* 歌名 h1 (text-2xl → 行高 2rem = h-8) */}
          <Skeleton className="h-8 w-3/5" />
          {/* 歌手 · 日期 (text-sm → 行高 1.25rem = h-5，mt-1) */}
          <Skeleton className="mt-1 h-5 w-2/5" />

          {/* YouTube 影片 (aspect-video, mt-4, rounded-2xl) */}
          <Skeleton className="mt-4 aspect-video w-full rounded-2xl" />

          {/* 平台 logo 橫排（mt-4，靠左，對齊 page.tsx 的 size-26 icon 列） */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="text-muted-foreground shrink-0 text-sm">觀看平台：</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-[26px] rounded-md" />
            ))}
          </div>

          {/* 描述：歌詞 citation 卡片骨架（對齊 LyricsCitation 結構） */}
          <div className="bg-card mt-4 rounded-[20px] px-8 pt-7 pb-[22px] shadow-sm">
            <div className="mx-auto max-w-[30ch] space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="mx-auto mt-5 h-3 w-32" />
          </div>
        </article>
      </div>
    </main>
  )
}

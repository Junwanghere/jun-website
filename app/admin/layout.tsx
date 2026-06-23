import type { Metadata } from 'next'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { LogoutButton } from './logout-button'

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // 後台不被搜尋引擎收錄
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-bold">
              後台
            </Link>
            <Link href="/admin/covers" className="text-muted-foreground hover:text-foreground">
              翻唱
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  )
}

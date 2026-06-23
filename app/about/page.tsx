import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '關於我',
  description: '我是王嘉駿（Jun Wang）。',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="text-2xl font-bold">我是王嘉駿</p>
    </main>
  )
}

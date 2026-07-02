import type { Metadata } from 'next'
import { TimelineAbout } from './timeline-about'

export const metadata: Metadata = {
  title: '關於我',
  description: '我是王嘉駿（Jun Wang）。從成功高中音創社、台大吉他社、Frescø、TJun，一直唱到現在。',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <main className="min-h-dvh">
      <TimelineAbout />
    </main>
  )
}

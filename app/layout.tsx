import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// 只載入 Inter(拉丁字,小)。中文交給系統字(PingFang TC / JhengHei / 內建 Noto)，
// 省下約 0.5MB 的 Noto Sans TC web font；JetBrains Mono 原本沒實際套用，一併移除。
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '王嘉駿 · Jun Wang',
    template: '%s｜王嘉駿 Jun Wang',
  },
  description: '王嘉駿 Jun Wang ── 唱歌的人。翻唱作品與個人網站。',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'zh_TW',
    url: SITE_URL,
    images: ['/jun-profile.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        style={{
          fontFamily:
            'var(--font-inter), system-ui, -apple-system, "PingFang TC", "Heiti TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoTC = Noto_Sans_TC({ subsets: ['latin'], variable: '--font-noto-tc' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-jb' })

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
        className={`${inter.variable} ${notoTC.variable} ${mono.variable} antialiased`}
        style={{
          fontFamily: 'var(--font-inter), var(--font-noto-tc), system-ui, sans-serif',
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
      </body>
    </html>
  )
}

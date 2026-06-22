import Image from 'next/image'
import { SiInstagram, SiThreads, SiYoutube } from 'react-icons/si'
import { PortalCard } from '@/components/portal-card'
import { SocialButton } from '@/components/social-button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <section className="mt-2 text-center">
          <div className="relative mx-auto size-20 overflow-hidden rounded-full shadow-md">
            <Image
              src="/jun-profile.jpg"
              alt="王嘉駿"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="mt-3 text-xl font-bold">Jun Wang</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">我是王嘉駿</p>
          <p className="text-muted-foreground/80 mt-2 text-sm">唱歌的人。</p>

          <div className="mt-4 flex justify-center gap-2.5">
            <SocialButton href="https://instagram.com/juniswang" label="Instagram">
              <SiInstagram className="size-4" />
            </SocialButton>
            <SocialButton href="https://www.threads.net/@juniswang" label="Threads">
              <SiThreads className="size-4" />
            </SocialButton>
            <SocialButton href="https://youtube.com" label="YouTube">
              <SiYoutube className="size-4" />
            </SocialButton>
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-3">
          <PortalCard
            href="/covers"
            label="COVERS"
            title="翻唱清單"
            description="唱過的歌"
            featured
          />
          {/* <PortalCard
            href="/writing"
            label="WRITING"
            title="文章 ／ 隨筆"
            description="技術筆記與生活雜記"
          />
          <PortalCard href="/work" label="WORK" title="作品集" description="音樂與網頁專案" /> */}
          <PortalCard href="/about" label="ABOUT" title="關於我" description="我是誰" />
        </section>

        <footer className="text-muted-foreground/70 mt-8 text-center text-xs">© 2026 王嘉駿</footer>
      </div>
    </main>
  )
}

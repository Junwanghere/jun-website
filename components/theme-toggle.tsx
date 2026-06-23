'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  // 佔位尺寸需與下方 size="icon" 按鈕一致（size-8 = 32px），否則 mount 時會位移
  if (!mounted) return <div className="size-8" />

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="切換亮暗模式"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

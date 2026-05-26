import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label?: string
  title: string
  description?: string
  featured?: boolean
}

export function PortalCard({ href, label, title, description, featured }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-2xl px-5 py-4 shadow-sm transition hover:shadow-md',
        featured
          ? 'bg-primary text-primary-foreground border-l-0'
          : 'border-primary/70 bg-card text-card-foreground border-l-2',
      )}
    >
      {label && (
        <div
          className={cn(
            'font-mono text-[10px] font-bold tracking-widest',
            featured ? 'opacity-90' : 'text-primary',
          )}
        >
          {label}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-base font-bold">{title}</span>
        <ArrowRight className="size-4 shrink-0 transition group-hover:translate-x-0.5" />
      </div>
      {description && (
        <div className={cn('mt-0.5 text-xs', featured ? 'opacity-90' : 'text-muted-foreground')}>
          {description}
        </div>
      )}
    </Link>
  )
}

import Link from 'next/link'
import type { ReactNode } from 'react'

export function SocialButton({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="bg-card text-foreground inline-flex size-9 items-center justify-center rounded-full shadow-sm transition hover:shadow"
    >
      {children}
    </Link>
  )
}

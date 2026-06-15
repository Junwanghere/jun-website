import { cn } from '@/lib/utils'

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground shadow-sm hover:shadow',
      )}
    >
      {label}
    </button>
  )
}

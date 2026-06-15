'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { syncDraftsNow } from './actions'

export function SyncButton() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span role="status" className="text-muted-foreground text-xs">
          {msg}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null)
            try {
              const r = await syncDraftsNow()
              setMsg(`新增 ${r.created}、略過 ${r.skipped}`)
            } catch {
              setMsg('同步失敗，請稍後再試')
            }
          })
        }
      >
        {pending ? '同步中⋯' : '立即同步'}
      </Button>
    </div>
  )
}

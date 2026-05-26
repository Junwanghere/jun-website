'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
}

export function ThumbnailUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('cover-thumbnails')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('cover-thumbnails').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div
          className="size-20 shrink-0 rounded-xl bg-muted"
          style={
            value
              ? { background: `center/cover no-repeat url('${value}')` }
              : undefined
          }
        />
        <div className="space-y-1">
          <label className="inline-block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              type="button"
              onClick={(e) => {
                ;(e.currentTarget.previousSibling as HTMLInputElement)?.click()
              }}
            >
              {uploading ? '上傳中⋯' : value ? '更換縮圖' : '上傳縮圖'}
            </Button>
          </label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              移除
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

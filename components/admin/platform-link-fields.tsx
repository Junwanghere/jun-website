'use client'

import { Controller, useFieldArray, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLATFORMS, PLATFORM_LABEL } from '@/lib/covers/types'
import type { CoverFormValues } from '@/lib/covers/schema'

export function PlatformLinkFields({ control }: { control: Control<CoverFormValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'links' })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>平台連結</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => append({ platform: 'youtube', platform_label: null, url: '' })}
        >
          ＋ 加一筆
        </Button>
      </div>

      <ul className="space-y-2">
        {fields.map((f, idx) => (
          <li key={f.id} className="border-border bg-card rounded-xl border p-3">
            <div className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
              <Controller
                control={control}
                name={`links.${idx}.platform` as const}
                render={({ field }) => (
                  <select
                    {...field}
                    className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {PLATFORM_LABEL[p]}
                      </option>
                    ))}
                  </select>
                )}
              />
              <Controller
                control={control}
                name={`links.${idx}.url` as const}
                render={({ field }) => <Input {...field} placeholder="https://..." />}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)}>
                移除
              </Button>
            </div>
            <Controller
              control={control}
              name={`links.${idx}.platform` as const}
              render={({ field: pField }) =>
                pField.value === 'other' ? (
                  <Controller
                    control={control}
                    name={`links.${idx}.platform_label` as const}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="mt-2"
                        placeholder="平台名稱（例如 StreetVoice）"
                      />
                    )}
                  />
                ) : (
                  <></>
                )
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

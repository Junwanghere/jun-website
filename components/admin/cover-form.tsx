'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { coverFormSchema, type CoverFormValues } from '@/lib/covers/schema'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'
import { PlatformLinkFields } from './platform-link-fields'
import { ThumbnailUpload } from './thumbnail-upload'
import { saveCover } from '@/app/admin/covers/actions'

type Props = {
  initialValues?: Partial<CoverFormValues> & { id?: string }
  status?: 'draft' | 'published'
}

export function CoverForm({ initialValues, status }: Props) {
  const router = useRouter()
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CoverFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(coverFormSchema as any),
    defaultValues: {
      title: initialValues?.title ?? '',
      original_artist: initialValues?.original_artist ?? '',
      cover_date: initialValues?.cover_date ?? new Date().toISOString().slice(0, 10),
      description: initialValues?.description ?? null,
      tags: initialValues?.tags ?? [],
      thumbnail_url: initialValues?.thumbnail_url ?? null,
      links: initialValues?.links ?? [{ platform: 'youtube', platform_label: null, url: '' }],
    },
  })

  // 若有 YouTube 連結且 thumbnail 為空，自動帶 YouTube 縮圖
  const links = watch('links')
  const thumb = watch('thumbnail_url')
  useEffect(() => {
    if (thumb) return
    for (const l of links ?? []) {
      if (l.platform === 'youtube') {
        const id = extractYouTubeId(l.url)
        if (id) {
          setValue('thumbnail_url', youtubeThumbnail(id), { shouldValidate: false })
          break
        }
      }
    }
  }, [links, thumb, setValue])

  async function onSubmit(values: CoverFormValues, publishAs?: 'draft' | 'published') {
    await saveCover({ id: initialValues?.id, values, status: publishAs })
    router.push('/admin/covers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">歌名</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="original_artist">原唱</Label>
        <Input id="original_artist" {...register('original_artist')} />
        {errors.original_artist && (
          <p className="text-destructive text-xs">{errors.original_artist.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover_date">發布日</Label>
        <Input id="cover_date" type="date" {...register('cover_date')} />
        {errors.cover_date && (
          <p className="text-destructive text-xs">{errors.cover_date.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">心得／簡介（可空）</Label>
        <textarea
          id="description"
          rows={4}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          {...register('description', {
            setValueAs: (v: string) => (v?.trim() ? v : null),
          })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags">類型標籤（用逗號分隔，可空）</Label>
        <Input
          id="tags"
          defaultValue={(getValues('tags') ?? []).join(', ')}
          onChange={(e) =>
            setValue(
              'tags',
              e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              { shouldValidate: true },
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label>縮圖</Label>
        <p className="text-muted-foreground text-xs">
          填了 YouTube 連結會自動帶縮圖，也可手動上傳覆蓋。
        </p>
        <ThumbnailUpload
          value={watch('thumbnail_url')}
          onChange={(v) => setValue('thumbnail_url', v)}
        />
      </div>

      <PlatformLinkFields control={control} />
      {errors.links && typeof errors.links.message === 'string' && (
        <p className="text-destructive text-xs">{errors.links.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
        {status === 'draft' ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSubmit((v) => onSubmit(v, 'draft'))}
            >
              先存草稿
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((v) => onSubmit(v, 'published'))}
            >
              {isSubmitting ? '發布中⋯' : '發布'}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '儲存中⋯' : '儲存'}
          </Button>
        )}
      </div>
    </form>
  )
}

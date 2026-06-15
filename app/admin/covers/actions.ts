'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { coverFormSchema, type CoverFormValues } from '@/lib/covers/schema'
import { syncYouTubeDrafts } from '@/lib/covers/sync-youtube'

export async function deleteCover(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('covers').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/covers')
  revalidatePath('/covers')
}

export async function saveCover(input: {
  id?: string
  values: CoverFormValues
  status?: 'draft' | 'published'
}) {
  const parsed = coverFormSchema.safeParse(input.values)
  if (!parsed.success) throw new Error('表單資料不合法')
  const values = parsed.data
  const supabase = await createClient()

  let coverId = input.id
  if (coverId) {
    const { error } = await supabase
      .from('covers')
      .update({
        title: values.title,
        original_artist: values.original_artist,
        cover_date: values.cover_date,
        description: values.description,
        tags: values.tags,
        thumbnail_url: values.thumbnail_url,
        // 只有明確指定 status 時才更新（編輯已發布項目時不動其狀態）
        ...(input.status ? { status: input.status } : {}),
      })
      .eq('id', coverId)
    if (error) throw error
    // 重置 links：刪掉再插入（量少不痛）
    const { error: delErr } = await supabase.from('cover_links').delete().eq('cover_id', coverId)
    if (delErr) throw delErr
  } else {
    const { data, error } = await supabase
      .from('covers')
      .insert({
        title: values.title,
        original_artist: values.original_artist,
        cover_date: values.cover_date,
        description: values.description,
        tags: values.tags,
        thumbnail_url: values.thumbnail_url,
        // 手動新增的翻唱預設為已發布
        status: input.status ?? 'published',
      })
      .select('id')
      .single()
    if (error) throw error
    coverId = data.id
  }

  const linkRows = values.links.map((l) => ({
    cover_id: coverId!,
    platform: l.platform,
    platform_label: l.platform_label,
    url: l.url,
  }))
  const { error: insErr } = await supabase.from('cover_links').insert(linkRows)
  if (insErr) throw insErr

  revalidatePath('/admin/covers')
  revalidatePath('/covers')
  revalidatePath(`/covers/${coverId}`)
}

export async function syncDraftsNow() {
  const result = await syncYouTubeDrafts()
  revalidatePath('/admin/covers')
  return result
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { coverFormSchema, type CoverFormValues } from '@/lib/covers/schema'

export async function deleteCover(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('covers').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/covers')
  revalidatePath('/covers')
}

export async function saveCover(input: { id?: string; values: CoverFormValues }) {
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

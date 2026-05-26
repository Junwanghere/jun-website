import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CoverQuery, CoverWithLinks } from './types'

export type CoverListResult = {
  items: CoverWithLinks[]
  total: number
  hasMore: boolean
}

export async function listCovers(query: CoverQuery): Promise<CoverListResult> {
  const supabase = await createClient()

  // 平台過濾用兩階段：先找有該平台連結的 cover id，再 in() 篩主表。
  // 這樣回來的 cover_links 仍包含該翻唱的所有平台連結（不只匹配的那個）。
  let coverIdsFilter: string[] | null = null
  if (query.platform) {
    const { data: ids, error: idErr } = await supabase
      .from('cover_links')
      .select('cover_id')
      .eq('platform', query.platform)
    if (idErr) throw idErr
    coverIdsFilter = Array.from(new Set((ids ?? []).map((r) => r.cover_id)))
    if (coverIdsFilter.length === 0) {
      return { items: [], total: 0, hasMore: false }
    }
  }

  let q = supabase
    .from('covers')
    .select('*, cover_links(*)', { count: 'exact' })
    .order('cover_date', { ascending: query.sort === 'oldest' })
    .range(query.offset, query.offset + query.limit - 1)

  if (coverIdsFilter) q = q.in('id', coverIdsFilter)

  if (query.q) {
    const escaped = query.q.replace(/[%_]/g, '\\$&')
    q = q.or(`title.ilike.%${escaped}%,original_artist.ilike.%${escaped}%`)
  }
  if (query.tag) q = q.contains('tags', [query.tag])

  const { data, error, count } = await q
  if (error) throw error

  const items = (data ?? []) as CoverWithLinks[]
  const total = count ?? 0
  return { items, total, hasMore: query.offset + items.length < total }
}

export async function getCoverById(id: string): Promise<CoverWithLinks | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('covers')
    .select('*, cover_links(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as CoverWithLinks | null
}

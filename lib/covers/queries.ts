import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { CoverQuery, CoverWithLinks } from './types'

export type CoverListResult = {
  items: CoverWithLinks[]
  total: number
  hasMore: boolean
}

export async function listCovers(
  query: CoverQuery,
  opts: { includeDrafts?: boolean; status?: 'draft' | 'published' } = {},
): Promise<CoverListResult> {
  const supabase = await createClient()

  let q = supabase
    .from('covers')
    .select('*, cover_links(*)', { count: 'exact' })
    .order('cover_date', { ascending: query.sort === 'oldest' })
    .range(query.offset, query.offset + query.limit - 1)

  // 狀態過濾：明確指定 status 優先；否則 fail-closed（公開端預設只給 published）
  if (opts.status) q = q.eq('status', opts.status)
  else if (!opts.includeDrafts) q = q.eq('status', 'published')

  if (query.q) {
    // 先移除 PostgREST .or() 過濾字串的結構字元（逗號與括號），否則 q 可注入額外過濾條件；
    // 再跳脫 LIKE 萬用字元 % _。其餘字元（含 . : 空白、中日文）保留，不影響正常搜尋。
    const escaped = query.q.replace(/[(),]/g, '').replace(/[%_]/g, '\\$&')
    if (escaped.trim()) {
      q = q.or(`title.ilike.%${escaped}%,original_artist.ilike.%${escaped}%`)
    }
  }
  if (query.artist) q = q.eq('original_artist', query.artist)
  if (query.tag) q = q.contains('tags', [query.tag])

  const { data, error, count } = await q
  if (error) throw error

  const items = (data ?? []) as CoverWithLinks[]
  const total = count ?? 0
  return { items, total, hasMore: query.offset + items.length < total }
}

// cache() 讓同一次請求內 generateMetadata 與頁面共用一次查詢（request 範圍去重）
export const getCoverById = cache(async function getCoverById(
  id: string,
  opts: { includeDrafts?: boolean } = {},
): Promise<CoverWithLinks | null> {
  const supabase = await createClient()
  let q = supabase.from('covers').select('*, cover_links(*)').eq('id', id)
  if (!opts.includeDrafts) q = q.eq('status', 'published')
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data as CoverWithLinks | null
})

export async function getTopOriginalArtists(limit = 3): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cover_artist_counts')
    .select('original_artist')
    .order('cover_count', { ascending: false })
    .order('original_artist', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r) => r.original_artist)
}

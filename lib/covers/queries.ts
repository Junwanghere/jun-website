import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { CoverQuery, CoverWithLinks } from './types'

export type CoverListResult = {
  items: CoverWithLinks[]
  total: number
  hasMore: boolean
}

export async function listCovers(
  query: CoverQuery,
  opts: { includeDrafts?: boolean } = {},
): Promise<CoverListResult> {
  const supabase = await createClient()

  let q = supabase
    .from('covers')
    .select('*, cover_links(*)', { count: 'exact' })
    .order('cover_date', { ascending: query.sort === 'oldest' })
    .range(query.offset, query.offset + query.limit - 1)

  if (!opts.includeDrafts) q = q.eq('status', 'published')

  if (query.q) {
    const escaped = query.q.replace(/[%_]/g, '\\$&')
    q = q.or(`title.ilike.%${escaped}%,original_artist.ilike.%${escaped}%`)
  }
  if (query.artist) q = q.eq('original_artist', query.artist)
  if (query.tag) q = q.contains('tags', [query.tag])

  const { data, error, count } = await q
  if (error) throw error

  const items = (data ?? []) as CoverWithLinks[]
  const total = count ?? 0
  return { items, total, hasMore: query.offset + items.length < total }
}

export async function getCoverById(
  id: string,
  opts: { includeDrafts?: boolean } = {},
): Promise<CoverWithLinks | null> {
  const supabase = await createClient()
  let q = supabase.from('covers').select('*, cover_links(*)').eq('id', id)
  if (!opts.includeDrafts) q = q.eq('status', 'published')
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data as CoverWithLinks | null
}

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

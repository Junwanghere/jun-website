import { type CoverQuery, type CoverSort } from './types'

const DEFAULT_LIMIT = 20

function asSort(v: unknown): CoverSort {
  return v === 'oldest' ? 'oldest' : 'newest'
}

function asOffset(v: unknown): number {
  if (typeof v !== 'string') return 0
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0) return 0
  return n
}

export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
): CoverQuery {
  const get = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k])
  return {
    q: get('q') || undefined,
    artist: get('artist') || undefined,
    tag: get('tag') || undefined,
    sort: asSort(get('sort')),
    limit: DEFAULT_LIMIT,
    offset: asOffset(get('cursor')),
  }
}

export function buildQueryString(q: Partial<CoverQuery>): string {
  const sp = new URLSearchParams()
  if (q.q) sp.set('q', q.q)
  if (q.artist) sp.set('artist', q.artist)
  if (q.tag) sp.set('tag', q.tag)
  if (q.sort && q.sort !== 'newest') sp.set('sort', q.sort)
  if (q.offset) sp.set('cursor', String(q.offset))
  return sp.toString()
}

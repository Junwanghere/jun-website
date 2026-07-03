import { z } from 'zod'
import { type CoverQuery, type CoverSort } from './types'

const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 50

function asSort(v: unknown): CoverSort {
  return v === 'oldest' ? 'oldest' : 'newest'
}

/**
 * 驗證並鉗制不可信的 CoverQuery（給公開 server action loadMoreCovers 用）。
 * client 可任意呼叫該 action，故：limit 上限 MAX_LIMIT（防一次撈全表 DoS）、offset 非負且有上限、
 * sort 白名單、搜尋字長度上限。任一欄位不合法時 fall back 到安全預設，不讓整個查詢炸掉。
 */
export const coverQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
  artist: z.string().trim().min(1).max(100).optional().catch(undefined),
  tag: z.string().trim().min(1).max(50).optional().catch(undefined),
  sort: z.enum(['newest', 'oldest']).catch('newest'),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).catch(MAX_LIMIT),
  offset: z.coerce.number().int().min(0).max(100_000).catch(0),
})

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
    offset: 0,
  }
}

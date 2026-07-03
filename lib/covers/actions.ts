'use server'

import { listCovers } from '@/lib/covers/queries'
import { coverQuerySchema } from '@/lib/covers/search-params'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

/** 取得某一批翻唱（給「載入更多」的客戶端累加用）。 */
export async function loadMoreCovers(query: CoverQuery): Promise<CoverWithLinks[]> {
  // query 來自 client，不可信：先過 zod 鉗制 limit/offset/長度，避免 DoS 與注入放大。
  const parsed = coverQuerySchema.safeParse(query)
  if (!parsed.success) return []
  const { items } = await listCovers(parsed.data)
  return items
}

'use server'

import { listCovers } from '@/lib/covers/queries'
import type { CoverQuery, CoverWithLinks } from '@/lib/covers/types'

/** 取得某一批翻唱（給「載入更多」的客戶端累加用）。 */
export async function loadMoreCovers(query: CoverQuery): Promise<CoverWithLinks[]> {
  const { items } = await listCovers(query)
  return items
}

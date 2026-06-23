import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600 // 每小時重建一次，發布的新翻唱會在一小時內出現在 sitemap

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/covers`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  let coverRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = createAdminClient()
    // service role 會繞過 RLS，明確只取已發布
    const { data } = await supabase
      .from('covers')
      .select('id, updated_at')
      .eq('status', 'published')
      .order('cover_date', { ascending: false })
    coverRoutes = (data ?? []).map((c) => ({
      url: `${SITE_URL}/covers/${c.id}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  } catch {
    // 撈不到（例如缺 service key）時退回只給靜態頁，sitemap 不整個壞掉
  }

  return [...staticRoutes, ...coverRoutes]
}

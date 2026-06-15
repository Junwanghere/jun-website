import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractYouTubeId, youtubeThumbnail } from '@/lib/youtube'
import { fetchChannelFeed, parseCoverTitle, selectNewEntries } from '@/lib/youtube/rss'

export type SyncResult = { created: number; skipped: number }

export async function syncYouTubeDrafts(): Promise<SyncResult> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID
  if (!channelId) throw new Error('Missing env: YOUTUBE_CHANNEL_ID')

  const supabase = createAdminClient()

  // 1. 既有 youtube 連結 → 已收錄 videoId 集合
  const { data: links, error: linkErr } = await supabase
    .from('cover_links')
    .select('url')
    .eq('platform', 'youtube')
  if (linkErr) throw linkErr
  const existing = new Set<string>()
  for (const l of links ?? []) {
    const id = extractYouTubeId(l.url)
    if (id) existing.add(id)
  }

  // 2. 抓 RSS → 過濾新片
  const feed = await fetchChannelFeed(channelId)
  const fresh = selectNewEntries(feed, existing)

  // 3. 逐筆建草稿
  let created = 0
  for (const entry of fresh) {
    const { song, artist } = parseCoverTitle(entry.title)
    const { data: cover, error: coverErr } = await supabase
      .from('covers')
      .insert({
        status: 'draft',
        title: song ?? entry.title, // 解析失敗放原始標題
        original_artist: artist ?? '', // 解析失敗留空字串，待人工補原唱
        cover_date: entry.published.slice(0, 10),
        thumbnail_url: youtubeThumbnail(entry.videoId),
      })
      .select('id')
      .single()
    if (coverErr) throw coverErr

    const { error: linkInsErr } = await supabase.from('cover_links').insert({
      cover_id: cover.id,
      platform: 'youtube',
      platform_label: null,
      url: `https://www.youtube.com/watch?v=${entry.videoId}`,
    })
    if (linkInsErr) {
      // link 建不起來就刪掉剛建的孤兒 cover（否則下次同步會因缺 YT 連結而重建成重複草稿）
      await supabase.from('covers').delete().eq('id', cover.id)
      throw linkInsErr
    }
    created += 1
  }

  return { created, skipped: feed.length - fresh.length }
}

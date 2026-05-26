export const PLATFORMS = ['youtube', 'instagram', 'threads', 'other'] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  threads: 'Threads',
  other: '其他',
}

export type CoverLink = {
  id: string
  cover_id: string
  platform: Platform
  platform_label: string | null
  url: string
}

export type Cover = {
  id: string
  title: string
  original_artist: string
  cover_date: string // ISO date
  thumbnail_url: string | null
  description: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export type CoverWithLinks = Cover & { cover_links: CoverLink[] }

export type CoverSort = 'newest' | 'oldest'

export type CoverQuery = {
  q?: string
  platform?: Platform
  tag?: string
  sort: CoverSort
  limit: number
  offset: number
}

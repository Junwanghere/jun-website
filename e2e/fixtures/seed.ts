// Uses raw PostgREST fetch to avoid supabase-js WebSocket initialisation
// (Node 20 lacks native WebSocket; we don't need realtime for seeding).

function baseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1`
}

function headers() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

async function pgFetch(path: string, init: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers: headers() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PostgREST ${init.method} ${path} → ${res.status}: ${body}`)
  }
  return res
}

export async function resetCovers() {
  // Delete in FK order: links first, then covers.
  await pgFetch('/cover_links?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' })
  await pgFetch('/covers?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' })
}

type Link = { platform: 'youtube' | 'instagram' | 'threads' | 'other'; url: string }
type Fixture = { title: string; original_artist: string; cover_date: string; links: Link[] }

export async function seedCovers() {
  const fixtures: Fixture[] = [
    {
      title: '交換餘生',
      original_artist: '林宥嘉',
      cover_date: '2026-05-01',
      links: [
        { platform: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' },
        { platform: 'instagram', url: 'https://instagram.com/p/abc' },
      ],
    },
    {
      title: '小酒窩',
      original_artist: '林俊傑',
      cover_date: '2026-04-15',
      links: [{ platform: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' }],
    },
    {
      title: '說好的幸福呢',
      original_artist: '周杰倫',
      cover_date: '2026-03-20',
      links: [{ platform: 'threads', url: 'https://www.threads.net/@juniswang/post/abc' }],
    },
  ]

  for (const f of fixtures) {
    const coverRes = await pgFetch('/covers', {
      method: 'POST',
      body: JSON.stringify({
        title: f.title,
        original_artist: f.original_artist,
        cover_date: f.cover_date,
      }),
    })
    const [cover] = (await coverRes.json()) as { id: string }[]
    if (!cover) continue

    await pgFetch('/cover_links', {
      method: 'POST',
      body: JSON.stringify(
        f.links.map((l) => ({
          cover_id: cover.id,
          platform: l.platform,
          url: l.url,
          platform_label: null,
        })),
      ),
    })
  }
}

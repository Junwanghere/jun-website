import { describe, it, expect, vi, afterEach } from 'vitest'
import { isShort } from '@/lib/youtube/rss'

afterEach(() => vi.unstubAllGlobals())

describe('isShort', () => {
  it('shorts 頁回 200 → 判定為 Short', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    expect(await isShort('abc123')).toBe(true)
  })

  it('shorts 頁轉址（303 → /watch）→ 不是 Short', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 303 })))
    expect(await isShort('abc123')).toBe(false)
  })

  it('用 redirect:manual 打對應 videoId 的 shorts 頁', async () => {
    const f = vi.fn(async (_url: string, _opts: RequestInit) => new Response(null, { status: 303 }))
    vi.stubGlobal('fetch', f)
    await isShort('xyz789')
    const [url, opts] = f.mock.calls[0]
    expect(url).toBe('https://www.youtube.com/shorts/xyz789')
    expect(opts).toMatchObject({ redirect: 'manual' })
  })

  it('檢查請求出錯 → 保守視為非 Short（寧可多建草稿，也不漏掉真正的翻唱）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    expect(await isShort('abc123')).toBe(false)
  })
})

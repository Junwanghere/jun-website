import { NextResponse } from 'next/server'
import { syncYouTubeDrafts } from '@/lib/covers/sync-youtube'

// 排程任務需即時執行，停用快取
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 以共用密鑰驗證請求來源（Vercel Cron 會帶上此 Authorization 標頭）
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await syncYouTubeDrafts()
  return NextResponse.json(result)
}

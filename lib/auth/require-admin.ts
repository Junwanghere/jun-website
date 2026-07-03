import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/lib/env'

/**
 * Data Access Layer 的授權關卡。middleware 只做路徑層級的樂觀攔截（見 middleware.ts）；
 * 真正動資料的 server action 必須各自呼叫本函式，因為 server action 靠全域 action ID 分派、
 * 與路徑解耦，可從非 /admin 路徑被觸發而繞過 middleware。
 *
 * 用 getUser()（會向 Auth server 驗 JWT）而非 getSession()。以 React cache memo，
 * 同一次請求內多次呼叫只驗一次。非白名單管理員一律 throw，fail-closed。
 */
export const requireAdmin = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email?.toLowerCase()
  if (!user || !email || !ADMIN_EMAILS.includes(email)) {
    throw new Error('Unauthorized: admin only')
  }
  return user
})

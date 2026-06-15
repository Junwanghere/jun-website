import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// service-role client：繞過 RLS，供 cron / 同步服務在無登入 session 下寫入。
// 純走 PostgREST，不開 Realtime，故 Node/serverless 環境安全。
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
  return createClient(env.SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

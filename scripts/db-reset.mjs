#!/usr/bin/env node
/**
 * 一鍵把本機 Supabase 重建到一致狀態：
 *   1. supabase db reset  → 套用所有 migration + 跑 supabase/seed.sql
 *   2. pnpm seed:admin    → 冪等建立 admin 帳號
 *   3. pnpm seed:covers   → 灌入 120 首真資料
 *
 * 任一步失敗即中止並回傳非零 exit code。
 *
 * 用法：
 *   pnpm db:reset
 */
import { spawnSync } from 'node:child_process'

const steps = [
  { label: 'supabase db reset', cmd: 'supabase', args: ['db', 'reset'] },
  { label: 'seed admin', cmd: 'pnpm', args: ['seed:admin'] },
  { label: 'seed covers', cmd: 'pnpm', args: ['seed:covers'] },
]

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`)
  const r = spawnSync(step.cmd, step.args, { stdio: 'inherit' })
  if (r.status !== 0) {
    // r.error 出現在指令本身無法執行時（例如沒裝 supabase CLI → ENOENT），
    // 這時 status 是 null，印 error.message 比 "exit null" 好懂。
    const detail = r.error ? r.error.message : `exit ${r.status}`
    console.error(`\n✗ Step failed: ${step.label} (${detail})`)
    process.exit(r.status ?? 1)
  }
}

console.log('\n✓ db:reset complete — schema + admin + covers all rebuilt.')

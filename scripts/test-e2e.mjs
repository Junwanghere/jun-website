#!/usr/bin/env node
/**
 * Wrapper for `playwright test` that always re-seeds local DB after the run.
 *
 * 為什麼需要：E2E 的 fixture（resetCovers + seedCovers）會把 covers + cover_links
 * 整個清空、再插 3 筆 fixture。跑完使用者打開 /covers 會看到 fixture，不是真資料。
 *
 * 行為：
 * - 用 spawn 跑 `playwright test`（直接繼承 argv，所以 `pnpm test:e2e --ui` 也 work）
 * - 不論 playwright pass / fail，最後跑 `pnpm seed:covers` 把 20 首真資料還原
 * - 最終 exit code = playwright 的 exit code（保留 CI 行為正確）
 */
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const test = spawnSync('pnpm', ['exec', 'playwright', 'test', ...args], { stdio: 'inherit' })

console.log('\n--- restoring real seed data ---')
spawnSync('pnpm', ['seed:covers'], { stdio: 'inherit' })

process.exit(test.status ?? 1)

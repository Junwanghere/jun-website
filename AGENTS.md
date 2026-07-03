<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# 專案慣例（改動前必讀）

- **`main` 受保護、PR-only**：不能直接 push `main`。開分支 → PR → CI（`test-build`、`verify-migrations`）綠燈才可合。詳見 README 的「開發流程」。
- **Migration 手動序號**：命名 `000X_名稱.sql`，接續現有最大號碼；不要用 `supabase migration new` 的時間戳名稱。改完先本機 `pnpm db:reset` 驗過。
- **管理員授權三層，缺一不可**：middleware（樂觀攔截）、server action 內的 `requireAdmin()`（`lib/auth/require-admin.ts`）、資料庫 RLS 的 `private.is_admin()`。新增會改資料的 server action 時，開頭一定要 `await requireAdmin()`——別只靠 middleware。
- **新增管理員要改兩個地方且一致**：`admin_emails` 資料表（寫 migration）＋ `ADMIN_EMAIL_ALLOWLIST` 環境變數。
- **SECURITY DEFINER 函式**放不對外的 `private` schema、釘死 `search_path`、只授權 `authenticated`（不給 `anon`）。改動 DB 後跑 `supabase db advisors --linked` 確認無新警告。
- **改 DB schema 或安全相關程式碼後**，本機用真實 REST 請求驗 RLS（非管理員被擋、管理員可寫、公開讀正常），不要只靠「編譯過」。

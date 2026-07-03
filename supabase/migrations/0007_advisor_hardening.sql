-- 回應 supabase db advisors 的安全建議。三件事，全部不改變外部行為：
-- 1) 把 is_admin() 從 public（會被 PostgREST API 曝光）移到不對外的 private schema，並取消 anon 的
--    execute 授權（寫入政策是 to authenticated，anon 本來就不會觸發它）。消除「public/anon 可直接
--    透過 API 呼叫 SECURITY DEFINER 函式」的警告。
-- 2) cover_artist_counts view 改為 security_invoker（ERROR 等級）：view 改以查詢者權限執行，而非建立者。
-- 3) set_updated_at() 釘死 search_path，消除 mutable search_path 警告。

-- ── 1. is_admin 移到 private schema ─────────────────────────────────────────
create schema if not exists private;
-- private schema 不對外：只給 authenticated 用（RLS 評估政策時需要 usage + execute），不給 anon。
revoke all on schema private from anon;
grant usage on schema private to authenticated;

-- search_path 設為空字串（最嚴格），函式內所有物件一律 schema 完整限定。
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- 把三個寫入政策改指向 private.is_admin()；先重建政策，才能安全 drop 舊的 public 版本。
drop policy if exists "covers_write_admin" on public.covers;
create policy "covers_write_admin" on public.covers
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "cover_links_write_admin" on public.cover_links;
create policy "cover_links_write_admin" on public.cover_links
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "thumbnails_admin_write" on storage.objects;
create policy "thumbnails_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'cover-thumbnails' and private.is_admin())
  with check (bucket_id = 'cover-thumbnails' and private.is_admin());

-- 舊的 public.is_admin() 此時已無政策依賴，可移除。
drop function if exists public.is_admin();

-- ── 2. cover_artist_counts 改 security_invoker（ERROR 等級）─────────────────
-- view 以查詢者身分執行；covers 的公開讀政策仍讓匿名讀得到聚合，行為不變。
alter view public.cover_artist_counts set (security_invoker = on);

-- ── 3. set_updated_at 釘死 search_path ─────────────────────────────────────
-- now() 屬 pg_catalog（永遠在搜尋路徑內），設空字串安全。
alter function public.set_updated_at() set search_path = '';

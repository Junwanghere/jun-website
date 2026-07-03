-- 收緊寫入授權：把 covers / cover_links / storage 縮圖的寫入政策
-- 從「任何已登入者（authenticated）」改為「僅白名單管理員」。
--
-- 動機：原本 0001/0002 的寫入政策是 `to authenticated using(true)`，等於只要有合法 JWT
-- 的任何人都能增刪改資料。而 NEXT_PUBLIC_SUPABASE_ANON_KEY 會被打包進前端 bundle（公開），
-- 若 Supabase 開放自助註冊，攻擊者可自建帳號取得 authenticated JWT，直接打 PostgREST API
-- 繞過 Next.js middleware 與 email 白名單，竄改/刪除全部資料。
-- 管理員判斷過去只存在應用層（middleware 的 ADMIN_EMAILS），資料層必須自己補上這道鎖。
--
-- 說明：
-- 1. cron / YouTube 同步走 service-role client（見 lib/supabase/admin.ts），service_role
--    角色本就繞過 RLS，不受本 migration 影響，同步照常運作。
-- 2. 你本人登入後台時用的是帶 cookie 的 anon-key client，JWT 內含你的 email，命中白名單，
--    is_admin() 回 true，後台增刪改照常。
-- 3. 白名單以資料表 admin_emails 維護；須與應用層的 ADMIN_EMAIL_ALLOWLIST 環境變數保持一致。

-- 管理員白名單表。開啟 RLS 且不建任何對外 policy → anon / authenticated 皆無法讀取，
-- 只有 service_role、postgres、以及下方 SECURITY DEFINER 函式能存取。
create table if not exists public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;

-- 種入目前的管理員 email（與 .env 的 ADMIN_EMAIL_ALLOWLIST 一致；新增管理員時兩邊都要加）。
insert into public.admin_emails (email) values ('junwangwrk@gmail.com')
  on conflict (email) do nothing;

-- 判斷「當前請求的 JWT email 是否為管理員」。
-- SECURITY DEFINER：以函式擁有者（postgres）身分執行內部查詢，藉此繞過 admin_emails 的 RLS。
-- set search_path 固定為 public，避免 search_path 注入。
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- covers / cover_links：改為僅管理員可寫（讀取政策 covers_select_all 不動，維持公開讀）。
drop policy if exists "covers_write_authenticated" on public.covers;
drop policy if exists "cover_links_write_authenticated" on public.cover_links;

create policy "covers_write_admin" on public.covers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cover_links_write_admin" on public.cover_links
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- storage 縮圖 bucket：寫入同樣收緊為僅管理員（公開讀政策 thumbnails_public_read 不動）。
drop policy if exists "thumbnails_authenticated_write" on storage.objects;

create policy "thumbnails_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'cover-thumbnails' and public.is_admin())
  with check (bucket_id = 'cover-thumbnails' and public.is_admin());

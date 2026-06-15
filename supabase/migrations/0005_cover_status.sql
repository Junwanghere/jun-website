-- 草稿/已發布狀態。預設 published：既有 row 加欄時自動套用，不受影響。
alter table public.covers
  add column status text not null default 'published'
  check (status in ('draft', 'published'));

create index covers_status_idx on public.covers (status);

-- 熱門原唱統計只算已發布（草稿不灌統計）。
-- view 在 Supabase 預設 security definer（繞 RLS），故必須在這裡顯式過濾。
create or replace view public.cover_artist_counts as
select
  original_artist,
  count(*)::int as cover_count
from public.covers
where status = 'published'
group by original_artist;

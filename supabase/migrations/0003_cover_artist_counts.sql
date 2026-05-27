-- 提供 top N 原唱查詢用的 view（PostgREST 不支援 GROUP BY，靠 view 包起來）
-- 自動繼承 covers 表的 RLS（covers_select_all 已允許 anon 讀）
create view public.cover_artist_counts as
select
  original_artist,
  count(*)::int as cover_count
from public.covers
group by original_artist;

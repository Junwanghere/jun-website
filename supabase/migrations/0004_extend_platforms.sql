-- Postgres check constraint 不能 ALTER，必須 drop + 重 add
-- 既有 row 不受影響（舊值都包含在新清單裡，新清單僅是擴充）
-- 0001_init_covers.sql 用 inline check 自動產生的約束名是 cover_links_platform_check

alter table public.cover_links
  drop constraint cover_links_platform_check;

alter table public.cover_links
  add constraint cover_links_platform_check
  check (platform in (
    'youtube',
    'instagram',
    'threads',
    'tiktok',
    'xiaohongshu',
    'other'
  ));

-- 翻唱主表
create table public.covers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_artist text not null,
  cover_date date not null,
  thumbnail_url text,
  description text,
  tags text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 平台連結（一首對多筆）
create table public.cover_links (
  id uuid primary key default gen_random_uuid(),
  cover_id uuid not null references public.covers(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'instagram', 'threads', 'other')),
  platform_label text,
  url text not null
);

-- 索引
create index covers_cover_date_idx on public.covers (cover_date desc);
create index covers_tags_idx on public.covers using gin (tags);
create index cover_links_cover_id_idx on public.cover_links (cover_id);
create index cover_links_platform_idx on public.cover_links (platform);

-- 更新 updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger covers_set_updated_at
before update on public.covers
for each row execute function public.set_updated_at();

-- RLS
alter table public.covers enable row level security;
alter table public.cover_links enable row level security;

-- 任何人可讀
create policy "covers_select_all" on public.covers for select using (true);
create policy "cover_links_select_all" on public.cover_links for select using (true);

-- 已登入才能寫
create policy "covers_write_authenticated" on public.covers
  for all to authenticated using (true) with check (true);
create policy "cover_links_write_authenticated" on public.cover_links
  for all to authenticated using (true) with check (true);

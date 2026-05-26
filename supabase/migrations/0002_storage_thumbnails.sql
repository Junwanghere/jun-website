-- 公開讀的縮圖 bucket
insert into storage.buckets (id, name, public)
values ('cover-thumbnails', 'cover-thumbnails', true)
on conflict (id) do nothing;

-- 已登入可上傳／更新／刪除
create policy "thumbnails_authenticated_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'cover-thumbnails')
  with check (bucket_id = 'cover-thumbnails');

-- 任何人可讀（bucket 本身已 public，但加 policy 保險）
create policy "thumbnails_public_read" on storage.objects
  for select to public
  using (bucket_id = 'cover-thumbnails');

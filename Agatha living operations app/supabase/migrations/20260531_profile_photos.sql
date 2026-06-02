alter table public.profiles
add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

drop policy if exists "Signed in users can upload profile photos" on storage.objects;
create policy "Signed in users can upload profile photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-photos');

drop policy if exists "Anyone can read profile photos" on storage.objects;
create policy "Anyone can read profile photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'profile-photos');

drop policy if exists "Signed in users can update profile photos" on storage.objects;
create policy "Signed in users can update profile photos"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-photos')
with check (bucket_id = 'profile-photos');

alter table public.profiles
add column if not exists approved_by_admin boolean not null default true,
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid references auth.users(id) on delete set null;

update public.profiles
set approved_by_admin = true,
    approved_at = coalesce(approved_at, now())
where approved_by_admin is null;

create index if not exists profiles_approved_by_admin_idx
on public.profiles(approved_by_admin);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaner_id_input uuid;
  profile_role public.app_role := 'admin';
begin
  if new.raw_user_meta_data ->> 'role' = 'cleaner' and new.raw_user_meta_data ->> 'cleaner_id' is not null then
    cleaner_id_input := (new.raw_user_meta_data ->> 'cleaner_id')::uuid;
    profile_role := 'cleaner';
  end if;

  insert into public.profiles (id, full_name, role, approved_by_admin)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), profile_role, false)
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role;

  if profile_role = 'cleaner' and cleaner_id_input is not null then
    update public.cleaners
    set auth_user_id = new.id,
        can_login = true,
        email = coalesce(email, new.email),
        updated_at = now()
    where id = cleaner_id_input
      and (email is null or lower(email) = lower(new.email));
  end if;

  return new;
end;
$$;

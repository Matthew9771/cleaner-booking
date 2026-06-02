alter table public.cleaners
add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
add column if not exists can_login boolean not null default false,
add column if not exists invite_token uuid not null default gen_random_uuid();

create unique index if not exists cleaners_auth_user_id_key
on public.cleaners(auth_user_id)
where auth_user_id is not null;

create unique index if not exists cleaners_invite_token_key
on public.cleaners(invite_token);

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

  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), profile_role)
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

create or replace function public.get_cleaner_invite(invite_token_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaner_record public.cleaners;
begin
  select *
  into cleaner_record
  from public.cleaners
  where invite_token = invite_token_input
    and active = true
    and can_login = true
    and email is not null;

  if cleaner_record.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', cleaner_record.id,
    'name', cleaner_record.name,
    'email', cleaner_record.email,
    'can_login', cleaner_record.can_login
  );
end;
$$;

grant execute on function public.get_cleaner_invite(uuid) to anon, authenticated;

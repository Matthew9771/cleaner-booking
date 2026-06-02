create or replace function public.repair_test_cleaner_login(cleaner_email_input text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  cleaner_record public.cleaners;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(cleaner_email_input)
  limit 1;

  if target_user_id is null then
    return jsonb_build_object('repaired', false, 'reason', 'no_auth_user');
  end if;

  select *
  into cleaner_record
  from public.cleaners
  where lower(email) = lower(cleaner_email_input)
  limit 1;

  if cleaner_record.id is null then
    return jsonb_build_object('repaired', false, 'reason', 'no_cleaner_profile');
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = target_user_id;

  update public.cleaners
  set auth_user_id = target_user_id,
      can_login = true,
      active = true,
      updated_at = now()
  where id = cleaner_record.id;

  insert into public.profiles (id, full_name, role)
  values (target_user_id, cleaner_record.name, 'cleaner')
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = 'cleaner',
      updated_at = now();

  return jsonb_build_object('repaired', true, 'cleaner_id', cleaner_record.id, 'auth_user_id', target_user_id);
end;
$$;

revoke execute on function public.repair_test_cleaner_login(text) from public, anon, authenticated;

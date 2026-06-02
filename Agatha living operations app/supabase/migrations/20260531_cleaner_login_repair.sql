create or replace function public.link_current_user_to_cleaner(cleaner_email_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  cleaner_record public.cleaners;
begin
  if current_user_id is null then
    return jsonb_build_object('linked', false, 'reason', 'not_signed_in');
  end if;

  select email
  into current_email
  from auth.users
  where id = current_user_id;

  select *
  into cleaner_record
  from public.cleaners
  where lower(email) = lower(coalesce(cleaner_email_input, current_email))
    and can_login = true
    and active = true
  limit 1;

  if cleaner_record.id is null then
    return jsonb_build_object('linked', false, 'reason', 'no_allowed_cleaner');
  end if;

  update public.cleaners
  set auth_user_id = current_user_id,
      updated_at = now()
  where id = cleaner_record.id;

  insert into public.profiles (id, full_name, role)
  values (current_user_id, coalesce(cleaner_record.name, current_email, ''), 'cleaner')
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'cleaner',
      updated_at = now();

  return jsonb_build_object('linked', true, 'cleaner_id', cleaner_record.id);
end;
$$;

grant execute on function public.link_current_user_to_cleaner(text) to authenticated;

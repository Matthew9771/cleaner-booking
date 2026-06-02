do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = 'admin@admin.com'
  limit 1;

  if target_user_id is not null then
    delete from public.profiles where id = target_user_id;
    delete from auth.identities where user_id = target_user_id;
    delete from auth.sessions where user_id = target_user_id;
    delete from auth.users where id = target_user_id;
  end if;
end $$;

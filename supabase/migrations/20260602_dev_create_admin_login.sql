create or replace function public.dev_create_or_reset_admin_login(admin_email_input text, new_password_input text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  target_user_id uuid;
  identities_has_email boolean;
begin
  if length(coalesce(new_password_input, '')) < 8 then
    return jsonb_build_object('created', false, 'reason', 'password_too_short');
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(admin_email_input)
  limit 1;

  if target_user_id is null then
    target_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      target_user_id,
      'authenticated',
      'authenticated',
      lower(admin_email_input),
      crypt(new_password_input, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Admin", "role": "admin"}'::jsonb,
      now(),
      now()
    );

  else
    update auth.users
    set encrypted_password = crypt(new_password_input, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        aud = 'authenticated',
        role = 'authenticated',
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider": "email", "providers": ["email"]}'::jsonb,
        updated_at = now()
    where id = target_user_id;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'email'
  )
  into identities_has_email;

  if not exists (
    select 1
    from auth.identities
    where user_id = target_user_id
      and provider = 'email'
  ) then
    if identities_has_email then
      execute '
        insert into auth.identities (
          id,
          user_id,
          identity_data,
          provider_id,
          provider,
          email,
          last_sign_in_at,
          created_at,
          updated_at
        )
        values ($1, $1, $2, $3, ''email'', $3, now(), now(), now())
      '
      using
        target_user_id,
        jsonb_build_object(
          'sub', target_user_id::text,
          'email', lower(admin_email_input),
          'email_verified', true,
          'phone_verified', false
        ),
        lower(admin_email_input);
    else
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider_id,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        target_user_id,
        target_user_id,
        jsonb_build_object(
          'sub', target_user_id::text,
          'email', lower(admin_email_input),
          'email_verified', true,
          'phone_verified', false
        ),
        lower(admin_email_input),
        'email',
        now(),
        now(),
        now()
      );
    end if;
  else
    update auth.identities
    set identity_data = jsonb_build_object(
          'sub', target_user_id::text,
          'email', lower(admin_email_input),
          'email_verified', true,
          'phone_verified', false
        ),
        provider_id = lower(admin_email_input),
        updated_at = now()
    where user_id = target_user_id
      and provider = 'email';

    if identities_has_email then
      execute '
        update auth.identities
        set email = $2,
            updated_at = now()
        where user_id = $1
          and provider = ''email''
      '
      using target_user_id, lower(admin_email_input);
    end if;
  end if;

  insert into public.profiles (id, full_name, role)
  values (target_user_id, 'Admin', 'admin')
  on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = 'admin',
      updated_at = now();

  return jsonb_build_object('created', true, 'email', lower(admin_email_input), 'auth_user_id', target_user_id);
end;
$$;

revoke execute on function public.dev_create_or_reset_admin_login(text, text) from public, anon, authenticated;

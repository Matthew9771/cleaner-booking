alter table public.profiles
add column if not exists approved_by_admin boolean not null default false,
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.profiles
alter column role set default 'cleaner',
alter column approved_by_admin set default false;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.approved_by_admin = true
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin'::public.app_role, false)
$$;

create or replace function public.current_cleaner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.cleaners c
  where c.auth_user_id = auth.uid()
    and c.can_login = true
    and c.active = true
  limit 1
$$;

create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.approved_by_admin is distinct from old.approved_by_admin
    or new.approved_at is distinct from old.approved_at
    or new.approved_by is distinct from old.approved_by then
    raise exception 'Only admins can change profile approval or role';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_changes on public.profiles;
create trigger profiles_prevent_privilege_changes
before update on public.profiles
for each row execute function public.prevent_profile_privilege_changes();

create or replace function public.prevent_cleaner_security_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.auth_user_id is distinct from old.auth_user_id
    or new.can_login is distinct from old.can_login
    or new.invite_token is distinct from old.invite_token
    or new.active is distinct from old.active
    or new.email is distinct from old.email then
    raise exception 'Only admins can change cleaner access settings';
  end if;

  return new;
end;
$$;

drop trigger if exists cleaners_prevent_security_changes on public.cleaners;
create trigger cleaners_prevent_security_changes
before update on public.cleaners
for each row execute function public.prevent_cleaner_security_changes();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaner_id_input uuid;
  profile_role public.app_role := 'cleaner';
  auto_approved boolean := false;
begin
  if new.raw_user_meta_data ->> 'role' = 'admin' then
    profile_role := 'admin';
  end if;

  if new.raw_user_meta_data ->> 'role' = 'cleaner' and new.raw_user_meta_data ->> 'cleaner_id' is not null then
    cleaner_id_input := (new.raw_user_meta_data ->> 'cleaner_id')::uuid;
    profile_role := 'cleaner';
    auto_approved := true;
  end if;

  insert into public.profiles (id, full_name, role, approved_by_admin, approved_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    profile_role,
    auto_approved,
    case when auto_approved then now() else null end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      approved_by_admin = excluded.approved_by_admin,
      approved_at = excluded.approved_at;

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

  insert into public.profiles (id, full_name, role, approved_by_admin, approved_at)
  values (current_user_id, coalesce(cleaner_record.name, current_email, ''), 'cleaner', true, now())
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = 'cleaner',
      approved_by_admin = true,
      approved_at = coalesce(public.profiles.approved_at, now()),
      updated_at = now();

  return jsonb_build_object('linked', true, 'cleaner_id', cleaner_record.id);
end;
$$;

drop policy if exists "Profiles are visible to signed in users" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Signed in users can manage properties" on public.properties;
drop policy if exists "Signed in users can manage cleaners" on public.cleaners;
drop policy if exists "Signed in users can manage bookings" on public.bookings;
drop policy if exists "Signed in users can manage cleaning jobs" on public.cleaning_jobs;
drop policy if exists "Signed in users can manage job responses" on public.cleaning_job_responses;
drop policy if exists "Signed in users can manage property supplies" on public.property_supplies;
drop policy if exists "Signed in users can manage maintenance tasks" on public.maintenance_tasks;
drop policy if exists "Signed in users can manage cleaner unavailability" on public.cleaner_unavailability;

create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin() or id = auth.uid());

create policy "Users can update basic own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage properties"
  on public.properties for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can read assigned and available properties"
  on public.properties for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.cleaning_jobs cj
      where cj.property_id = properties.id
        and (
          cj.cleaner_id = public.current_cleaner_id()
          or (cj.cleaner_id is null and cj.booking_id is not null and cj.status = 'draft')
        )
    )
  );

create policy "Admins can manage cleaners"
  on public.cleaners for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can read own cleaner record"
  on public.cleaners for select
  to authenticated
  using (id = public.current_cleaner_id());

create policy "Cleaners can update own non-access settings"
  on public.cleaners for update
  to authenticated
  using (id = public.current_cleaner_id())
  with check (id = public.current_cleaner_id());

create policy "Admins can manage bookings"
  on public.bookings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can read bookings attached to own jobs"
  on public.bookings for select
  to authenticated
  using (
    exists (
      select 1
      from public.cleaning_jobs cj
      where cj.booking_id = bookings.id
        and cj.cleaner_id = public.current_cleaner_id()
    )
  );

create policy "Admins can manage cleaning jobs"
  on public.cleaning_jobs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can read assigned and available cleaning jobs"
  on public.cleaning_jobs for select
  to authenticated
  using (
    cleaner_id = public.current_cleaner_id()
    or (cleaner_id is null and booking_id is not null and status = 'draft')
  );

create policy "Cleaners can update assigned and available cleaning jobs"
  on public.cleaning_jobs for update
  to authenticated
  using (
    cleaner_id = public.current_cleaner_id()
    or (cleaner_id is null and booking_id is not null and status = 'draft')
  )
  with check (
    cleaner_id = public.current_cleaner_id()
    or (cleaner_id is null and booking_id is not null and status = 'draft')
  );

create policy "Admins can manage job responses"
  on public.cleaning_job_responses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can read own job responses"
  on public.cleaning_job_responses for select
  to authenticated
  using (cleaner_id = public.current_cleaner_id());

create policy "Admins can manage property supplies"
  on public.property_supplies for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage maintenance tasks"
  on public.maintenance_tasks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can read maintenance for own jobs"
  on public.maintenance_tasks for select
  to authenticated
  using (
    cleaning_job_id in (
      select cj.id
      from public.cleaning_jobs cj
      where cj.cleaner_id = public.current_cleaner_id()
    )
  );

create policy "Admins can manage cleaner unavailability"
  on public.cleaner_unavailability for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cleaners can manage own unavailability"
  on public.cleaner_unavailability for all
  to authenticated
  using (cleaner_id = public.current_cleaner_id())
  with check (cleaner_id = public.current_cleaner_id());

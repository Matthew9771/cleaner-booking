create type public.app_role as enum ('admin', 'cleaner');
create type public.cleaning_job_status as enum ('draft', 'offered', 'pending', 'ready_for_review', 'accepted', 'declined', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  check_out_time time not null default '11:00',
  check_in_time time not null default '15:00',
  bedrooms integer,
  bathrooms numeric(3,1),
  ical_feed_url text,
  ical_last_synced_at timestamptz,
  default_cleaner_id uuid references public.cleaners(id) on delete set null,
  backup_cleaner_id uuid references public.cleaners(id) on delete set null,
  default_duration_minutes integer not null default 180,
  default_payment_pence integer not null default 6000,
  current_lockbox_code text,
  cleaning_notes text,
  cleaning_checklist text[] not null default array['Kitchen', 'Living areas', 'Bedrooms', 'Bathrooms', 'Hallway', 'Lockbox'],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cleaners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  avatar_url text,
  auth_user_id uuid references auth.users(id) on delete set null,
  can_login boolean not null default false,
  invite_token uuid not null default gen_random_uuid(),
  is_primary boolean not null default false,
  active boolean not null default true,
  weekly_availability jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{"whatsapp": true, "email": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  guest_name text,
  source text not null default 'Airbnb',
  check_in_date date not null,
  check_out_date date not null,
  guest_lockbox_code text,
  notes text,
  reviewed boolean not null default false,
  reviewed_at timestamptz,
  external_uid text,
  external_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cleaning_jobs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  cleaner_id uuid references public.cleaners(id) on delete set null,
  job_date date not null,
  duration_minutes integer not null default 180,
  payment_pence integer not null default 6000,
  current_lockbox_code text,
  new_lockbox_code text,
  public_offer_token uuid not null default gen_random_uuid(),
  status public.cleaning_job_status not null default 'draft',
  offered_at timestamptz,
  responded_at timestamptz,
  before_photos_confirmed boolean not null default false,
  after_photos_confirmed boolean not null default false,
  before_photo_paths text[] not null default '{}',
  after_photo_paths text[] not null default '{}',
  checklist_completed text[] not null default '{}',
  completion_notes text,
  completion_issue_tags text[] not null default '{}',
  admin_review_notes text,
  admin_quality_rating integer check (admin_quality_rating between 1 and 5),
  admin_quality_notes text,
  cleaner_started_at timestamptz,
  cleaner_completed_at timestamptz,
  completed_at timestamptz,
  cleaner_invoice_number text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_supplies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  item_name text not null,
  quantity text,
  status text not null default 'ok' check (status in ('ok', 'low', 'out', 'ordered')),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  cleaning_job_id uuid references public.cleaning_jobs(id) on delete set null,
  title text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.cleaner_unavailability (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  unavailable_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (cleaner_id, unavailable_date)
);

create table public.cleaning_job_responses (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs(id) on delete cascade,
  cleaner_id uuid references public.cleaners(id) on delete set null,
  response text not null check (response in ('yes', 'no')),
  message text,
  created_at timestamptz not null default now()
);

create unique index cleaning_jobs_public_offer_token_key
on public.cleaning_jobs(public_offer_token);

create unique index bookings_external_uid_key
on public.bookings(external_uid);

create unique index cleaners_auth_user_id_key
on public.cleaners(auth_user_id)
where auth_user_id is not null;

create unique index cleaners_invite_token_key
on public.cleaners(invite_token);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.cleaners enable row level security;
alter table public.bookings enable row level security;
alter table public.cleaning_jobs enable row level security;
alter table public.cleaning_job_responses enable row level security;
alter table public.property_supplies enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.cleaner_unavailability enable row level security;

create policy "Profiles are visible to signed in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Signed in users can manage properties"
  on public.properties for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage cleaners"
  on public.cleaners for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage bookings"
  on public.bookings for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage cleaning jobs"
  on public.cleaning_jobs for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage job responses"
  on public.cleaning_job_responses for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage property supplies"
  on public.property_supplies for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage maintenance tasks"
  on public.maintenance_tasks for all
  to authenticated
  using (true)
  with check (true);

create policy "Signed in users can manage cleaner unavailability"
  on public.cleaner_unavailability for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create trigger cleaners_set_updated_at
before update on public.cleaners
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger cleaning_jobs_set_updated_at
before update on public.cleaning_jobs
for each row execute function public.set_updated_at();

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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_public_cleaning_job_offer(offer_token_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer jsonb;
begin
  select jsonb_build_object(
    'id', cj.id,
    'status', cj.status,
    'job_date', cj.job_date,
    'duration_minutes', cj.duration_minutes,
    'payment_pence', cj.payment_pence,
    'current_lockbox_code', cj.current_lockbox_code,
    'new_lockbox_code', cj.new_lockbox_code,
    'completed_at', cj.completed_at,
    'cleaner_completed_at', cj.cleaner_completed_at,
    'completion_notes', cj.completion_notes,
    'before_photos_confirmed', cj.before_photos_confirmed,
    'after_photos_confirmed', cj.after_photos_confirmed,
    'property_name', p.name,
    'property_address', p.address,
    'cleaning_checklist', p.cleaning_checklist,
    'cleaner_name', c.name
  )
  into offer
  from public.cleaning_jobs cj
  join public.properties p on p.id = cj.property_id
  left join public.cleaners c on c.id = cj.cleaner_id
  where cj.public_offer_token = offer_token_input;

  return offer;
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

create or replace function public.respond_to_cleaning_job_offer(
  offer_token_input uuid,
  response_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record public.cleaning_jobs;
begin
  if response_input not in ('yes', 'no') then
    raise exception 'Invalid response';
  end if;

  select *
  into job_record
  from public.cleaning_jobs
  where public_offer_token = offer_token_input;

  if job_record.id is null then
    raise exception 'Cleaning job offer not found';
  end if;

  update public.cleaning_jobs
  set
    status = case
      when response_input = 'yes' then 'pending'::public.cleaning_job_status
      else 'declined'::public.cleaning_job_status
    end,
    responded_at = now()
  where id = job_record.id;

  insert into public.cleaning_job_responses (cleaning_job_id, cleaner_id, response)
  values (job_record.id, job_record.cleaner_id, response_input);

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

grant execute on function public.get_public_cleaning_job_offer(uuid) to anon, authenticated;
grant execute on function public.respond_to_cleaning_job_offer(uuid, text) to anon, authenticated;

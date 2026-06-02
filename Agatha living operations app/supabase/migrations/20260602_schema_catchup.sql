alter table public.profiles
add column if not exists avatar_url text;

alter table public.cleaners
add column if not exists email text,
add column if not exists avatar_url text,
add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
add column if not exists can_login boolean not null default false,
add column if not exists invite_token uuid not null default gen_random_uuid(),
add column if not exists is_primary boolean not null default false,
add column if not exists active boolean not null default true,
add column if not exists preferred_areas text,
add column if not exists availability_notes text,
add column if not exists weekly_availability jsonb not null default '{}'::jsonb,
add column if not exists notification_preferences jsonb not null default '{"whatsapp": true, "email": false}'::jsonb;

create unique index if not exists cleaners_auth_user_id_key
on public.cleaners(auth_user_id)
where auth_user_id is not null;

create unique index if not exists cleaners_invite_token_key
on public.cleaners(invite_token);

alter table public.properties
add column if not exists bedrooms integer,
add column if not exists bathrooms numeric(3,1),
add column if not exists default_cleaner_id uuid references public.cleaners(id) on delete set null,
add column if not exists backup_cleaner_id uuid references public.cleaners(id) on delete set null,
add column if not exists default_duration_minutes integer not null default 180,
add column if not exists default_payment_pence integer not null default 6000,
add column if not exists current_lockbox_code text,
add column if not exists cleaning_notes text,
add column if not exists cleaning_checklist text[] not null default array['Kitchen', 'Living areas', 'Bedrooms', 'Bathrooms', 'Hallway', 'Lockbox'];

alter table public.cleaning_jobs
add column if not exists before_photos_confirmed boolean not null default false,
add column if not exists after_photos_confirmed boolean not null default false,
add column if not exists before_photo_paths text[] not null default '{}',
add column if not exists after_photo_paths text[] not null default '{}',
add column if not exists completion_notes text,
add column if not exists completion_issue_tags text[] not null default '{}',
add column if not exists admin_review_notes text,
add column if not exists cleaner_started_at timestamptz,
add column if not exists cleaner_completed_at timestamptz,
add column if not exists checklist_completed text[] not null default '{}',
add column if not exists admin_quality_rating integer check (admin_quality_rating between 1 and 5),
add column if not exists admin_quality_notes text,
add column if not exists cleaner_invoice_number text,
add column if not exists cleaner_paid_at timestamptz;

create table if not exists public.cleaner_unavailability (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  unavailable_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (cleaner_id, unavailable_date)
);

alter table public.cleaner_unavailability enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cleaner_unavailability'
      and policyname = 'Signed in users can manage cleaner unavailability'
  ) then
    create policy "Signed in users can manage cleaner unavailability"
      on public.cleaner_unavailability for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  guest_name text,
  source text not null default 'Airbnb',
  check_in_date date not null,
  check_out_date date not null,
  guest_lockbox_code text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cleaning_jobs
add column if not exists booking_id uuid references public.bookings(id) on delete set null;

alter table public.bookings enable row level security;

drop policy if exists "Signed in users can manage bookings" on public.bookings;

create policy "Signed in users can manage bookings"
  on public.bookings for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists bookings_set_updated_at on public.bookings;

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

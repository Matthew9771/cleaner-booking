alter table public.bookings
add column if not exists reviewed boolean not null default false,
add column if not exists reviewed_at timestamptz;

alter table public.properties
add column if not exists ical_feed_url text,
add column if not exists ical_last_synced_at timestamptz;

alter table public.bookings
add column if not exists external_uid text,
add column if not exists external_url text;

create unique index if not exists bookings_external_uid_key
on public.bookings(external_uid);

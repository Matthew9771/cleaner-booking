drop index if exists public.bookings_external_uid_key;

create unique index if not exists bookings_external_uid_key
on public.bookings(external_uid);

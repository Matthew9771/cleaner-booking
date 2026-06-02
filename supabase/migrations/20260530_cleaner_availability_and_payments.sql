alter table public.cleaners
add column if not exists availability_notes text,
add column if not exists preferred_areas text;

alter table public.cleaning_jobs
add column if not exists cleaner_paid_at timestamptz;

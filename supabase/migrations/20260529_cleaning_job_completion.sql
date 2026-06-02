alter table public.cleaning_jobs
add column if not exists before_photos_confirmed boolean not null default false,
add column if not exists after_photos_confirmed boolean not null default false,
add column if not exists completion_notes text,
add column if not exists completed_at timestamptz;

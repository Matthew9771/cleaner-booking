alter table public.properties
add column if not exists default_cleaner_id uuid references public.cleaners(id) on delete set null,
add column if not exists backup_cleaner_id uuid references public.cleaners(id) on delete set null,
add column if not exists default_duration_minutes integer not null default 180,
add column if not exists default_payment_pence integer not null default 6000,
add column if not exists current_lockbox_code text,
add column if not exists cleaning_notes text;

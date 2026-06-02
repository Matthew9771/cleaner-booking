insert into storage.buckets (id, name, public)
values ('cleaning-photos', 'cleaning-photos', false)
on conflict (id) do nothing;

create policy "Anyone can upload cleaning photos"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'cleaning-photos');

create policy "Signed in users can read cleaning photos"
on storage.objects for select
to authenticated
using (bucket_id = 'cleaning-photos');

alter table public.cleaning_jobs
add column if not exists before_photo_paths text[] not null default '{}',
add column if not exists after_photo_paths text[] not null default '{}';

create table if not exists public.property_supplies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  item_name text not null,
  quantity text,
  status text not null default 'ok' check (status in ('ok', 'low', 'out', 'ordered')),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_tasks (
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

create table if not exists public.cleaner_unavailability (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  unavailable_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (cleaner_id, unavailable_date)
);

alter table public.property_supplies enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.cleaner_unavailability enable row level security;

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

create or replace function public.complete_cleaning_job_from_offer(
  offer_token_input uuid,
  before_photos_input boolean,
  after_photos_input boolean,
  completion_notes_input text,
  before_photo_paths_input text[] default '{}',
  after_photo_paths_input text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record public.cleaning_jobs;
begin
  select *
  into job_record
  from public.cleaning_jobs
  where public_offer_token = offer_token_input;

  if job_record.id is null then
    raise exception 'Cleaning job offer not found';
  end if;

  if job_record.status not in ('accepted', 'pending', 'ready_for_review', 'completed') then
    raise exception 'This cleaning job has not been confirmed';
  end if;

  update public.cleaning_jobs
  set
    before_photos_confirmed = coalesce(before_photos_input, false),
    after_photos_confirmed = coalesce(after_photos_input, false),
    before_photo_paths = coalesce(before_photo_paths_input, '{}'),
    after_photo_paths = coalesce(after_photo_paths_input, '{}'),
    completion_notes = nullif(trim(completion_notes_input), ''),
    cleaner_completed_at = coalesce(cleaner_completed_at, now()),
    status = 'ready_for_review'::public.cleaning_job_status
  where id = job_record.id;

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

grant execute on function public.complete_cleaning_job_from_offer(uuid, boolean, boolean, text, text[], text[]) to anon, authenticated;

alter table public.cleaning_jobs
add column if not exists cleaner_started_at timestamptz,
add column if not exists checklist_completed text[] not null default '{}',
add column if not exists admin_quality_rating integer check (admin_quality_rating between 1 and 5),
add column if not exists admin_quality_notes text,
add column if not exists cleaner_invoice_number text;

alter table public.cleaners
add column if not exists weekly_availability jsonb not null default '{}'::jsonb,
add column if not exists notification_preferences jsonb not null default '{"whatsapp": true, "email": false}'::jsonb;

alter table public.properties
add column if not exists cleaning_checklist text[] not null default array['Kitchen', 'Living areas', 'Bedrooms', 'Bathrooms', 'Hallway', 'Lockbox'];

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

create or replace function public.complete_cleaning_job_from_offer(
  offer_token_input uuid,
  before_photos_input boolean,
  after_photos_input boolean,
  completion_notes_input text,
  before_photo_paths_input text[] default '{}',
  after_photo_paths_input text[] default '{}',
  checklist_completed_input text[] default '{}'
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
    checklist_completed = coalesce(checklist_completed_input, '{}'),
    completion_notes = nullif(trim(completion_notes_input), ''),
    cleaner_completed_at = coalesce(cleaner_completed_at, now()),
    status = 'ready_for_review'::public.cleaning_job_status
  where id = job_record.id;

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

grant execute on function public.complete_cleaning_job_from_offer(uuid, boolean, boolean, text, text[], text[], text[]) to anon, authenticated;

alter type public.cleaning_job_status add value if not exists 'pending';
alter type public.cleaning_job_status add value if not exists 'ready_for_review';

alter table public.properties
add column if not exists bedrooms integer,
add column if not exists bathrooms numeric(3,1);

alter table public.cleaning_jobs
add column if not exists cleaner_completed_at timestamptz;

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

create or replace function public.respond_to_cleaning_job_offer(
  offer_token_input uuid,
  response_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_record public.cleaning_jobs;
begin
  if response_input not in ('yes', 'no') then
    raise exception 'Invalid response';
  end if;

  select *
  into job_record
  from public.cleaning_jobs
  where public_offer_token = offer_token_input;

  if job_record.id is null then
    raise exception 'Cleaning job offer not found';
  end if;

  update public.cleaning_jobs
  set
    status = case
      when response_input = 'yes' then 'pending'::public.cleaning_job_status
      else 'declined'::public.cleaning_job_status
    end,
    responded_at = now()
  where id = job_record.id;

  insert into public.cleaning_job_responses (cleaning_job_id, cleaner_id, response)
  values (job_record.id, job_record.cleaner_id, response_input);

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

create or replace function public.complete_cleaning_job_from_offer(
  offer_token_input uuid,
  before_photos_input boolean,
  after_photos_input boolean,
  completion_notes_input text
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

  if job_record.status not in ('pending', 'ready_for_review', 'completed') then
    raise exception 'This cleaning job has not been confirmed';
  end if;

  update public.cleaning_jobs
  set
    before_photos_confirmed = coalesce(before_photos_input, false),
    after_photos_confirmed = coalesce(after_photos_input, false),
    completion_notes = nullif(trim(completion_notes_input), ''),
    cleaner_completed_at = coalesce(cleaner_completed_at, now()),
    status = 'ready_for_review'::public.cleaning_job_status
  where id = job_record.id;

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

grant execute on function public.get_public_cleaning_job_offer(uuid) to anon, authenticated;
grant execute on function public.respond_to_cleaning_job_offer(uuid, text) to anon, authenticated;
grant execute on function public.complete_cleaning_job_from_offer(uuid, boolean, boolean, text) to anon, authenticated;

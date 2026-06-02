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

  if job_record.status not in ('accepted', 'completed') then
    raise exception 'This cleaning job has not been accepted';
  end if;

  update public.cleaning_jobs
  set
    before_photos_confirmed = coalesce(before_photos_input, false),
    after_photos_confirmed = coalesce(after_photos_input, false),
    completion_notes = nullif(trim(completion_notes_input), ''),
    completed_at = coalesce(completed_at, now()),
    status = 'completed'::public.cleaning_job_status
  where id = job_record.id;

  if job_record.property_id is not null and job_record.new_lockbox_code is not null then
    update public.properties
    set current_lockbox_code = job_record.new_lockbox_code
    where id = job_record.property_id;
  end if;

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

grant execute on function public.get_public_cleaning_job_offer(uuid) to anon, authenticated;
grant execute on function public.complete_cleaning_job_from_offer(uuid, boolean, boolean, text) to anon, authenticated;

alter table public.cleaning_jobs
add column if not exists public_offer_token uuid not null default gen_random_uuid();

create unique index if not exists cleaning_jobs_public_offer_token_key
on public.cleaning_jobs(public_offer_token);

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
      when response_input = 'yes' then 'accepted'::public.cleaning_job_status
      else 'declined'::public.cleaning_job_status
    end,
    responded_at = now()
  where id = job_record.id;

  insert into public.cleaning_job_responses (cleaning_job_id, cleaner_id, response)
  values (job_record.id, job_record.cleaner_id, response_input);

  return public.get_public_cleaning_job_offer(offer_token_input);
end;
$$;

grant execute on function public.get_public_cleaning_job_offer(uuid) to anon, authenticated;
grant execute on function public.respond_to_cleaning_job_offer(uuid, text) to anon, authenticated;

create or replace function public.get_cleaner_calendar_feed(feed_token_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaner_record public.cleaners;
  jobs jsonb;
begin
  select *
  into cleaner_record
  from public.cleaners
  where invite_token = feed_token_input
    and active = true
  limit 1;

  if cleaner_record.id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cj.id,
    'job_date', cj.job_date,
    'status', cj.status,
    'payment_pence', cj.payment_pence,
    'property_name', p.name,
    'property_address', p.address,
    'cleaner_name', cleaner_record.name,
    'check_out_time', p.check_out_time,
    'check_in_time', p.check_in_time
  ) order by cj.job_date), '[]'::jsonb)
  into jobs
  from public.cleaning_jobs cj
  join public.properties p on p.id = cj.property_id
  where cj.cleaner_id = cleaner_record.id
    and cj.status in ('accepted', 'pending', 'ready_for_review', 'completed')
    and cj.job_date >= current_date - interval '30 days'
    and cj.job_date <= current_date + interval '180 days';

  return jobs;
end;
$$;

create or replace function public.get_admin_calendar_feed(admin_token_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_profile public.profiles;
  jobs jsonb;
begin
  select *
  into admin_profile
  from public.profiles
  where id = admin_token_input
    and role = 'admin'
  limit 1;

  if admin_profile.id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cj.id,
    'job_date', cj.job_date,
    'status', cj.status,
    'payment_pence', cj.payment_pence,
    'property_name', p.name,
    'property_address', p.address,
    'cleaner_name', c.name,
    'check_out_time', p.check_out_time,
    'check_in_time', p.check_in_time
  ) order by cj.job_date), '[]'::jsonb)
  into jobs
  from public.cleaning_jobs cj
  join public.properties p on p.id = cj.property_id
  left join public.cleaners c on c.id = cj.cleaner_id
  where cj.status in ('draft', 'offered', 'accepted', 'pending', 'ready_for_review', 'completed')
    and cj.job_date >= current_date - interval '30 days'
    and cj.job_date <= current_date + interval '180 days';

  return jobs;
end;
$$;

grant execute on function public.get_cleaner_calendar_feed(uuid) to anon, authenticated;
grant execute on function public.get_admin_calendar_feed(uuid) to anon, authenticated;

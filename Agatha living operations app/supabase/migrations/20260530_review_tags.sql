alter table public.cleaning_jobs
add column if not exists completion_issue_tags text[] not null default '{}',
add column if not exists admin_review_notes text;

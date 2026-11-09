-- Per-app screen time and the app in use right now, for the student's
-- guardians (never teachers). Written only by the phone's monitor through
-- the `ingest` edge function; the student and linked guardians can read it.

create table public.app_usage (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  package text not null check (char_length(package) <= 200),
  label text not null check (char_length(label) <= 80),
  category text not null check (category in ('video', 'social', 'games', 'study', 'other')),
  minutes int not null check (minutes between 0 and 1440),
  updated_at timestamptz not null default now(),
  primary key (student_id, day, package)
);
create index app_usage_student_day_idx on public.app_usage (student_id, day desc);

create table public.live_status (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  package text,
  label text,
  category text check (category in ('video', 'social', 'games', 'study', 'other')),
  session_min int not null default 0,
  screen_on boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_usage enable row level security;
alter table public.live_status enable row level security;

create policy "app usage: student and guardians read" on public.app_usage for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "live status: student and guardians read" on public.live_status for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));

grant select on public.app_usage, public.live_status to authenticated;
grant all on public.app_usage, public.live_status to service_role;

alter publication supabase_realtime add table public.app_usage, public.live_status;

-- LearnShift core schema.
-- Privacy model: guardians see habits (usage, nudges, requests), never grades.
-- Teachers see learning (attempts, mastery, tutor answers), never screen time.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ── Profiles ──────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'guardian', 'teacher')),
  display_name text not null check (char_length(display_name) between 1 and 60),
  grade smallint check (grade between 7 and 12),
  lang text not null default 'en' check (lang in ('en', 'fil')),
  created_at timestamptz not null default now()
);

create table public.guardian_links (
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (guardian_id, student_id)
);
create index guardian_links_student_idx on public.guardian_links (student_id);

create table public.link_codes (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table private.link_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index link_attempts_idx on private.link_attempts (user_id, at);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  grade smallint not null default 8 check (grade between 7 and 12),
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on public.classes (teacher_id);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student_idx on public.class_members (student_id);

-- ── Relationship helpers (used by policies; not exposed through the API) ──

create function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function private.is_guardian_of(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guardian_links
    where guardian_id = (select auth.uid()) and student_id = sid
  )
$$;

create function private.is_teacher_of(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id
    where c.teacher_id = (select auth.uid()) and m.student_id = sid
  )
$$;

-- The caller is a student and `pid` is one of their guardians or teachers.
create function private.is_adult_of_me(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guardian_links
    where student_id = (select auth.uid()) and guardian_id = pid
  ) or exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = (select auth.uid()) and c.teacher_id = pid
  )
$$;

create function private.is_member_of(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members
    where class_id = cid and student_id = (select auth.uid())
  )
$$;

create function private.gen_digits(n int) returns text
language sql volatile set search_path = '' as $$
  select string_agg(floor(random() * 10)::int::text, '')
  from generate_series(1, n)
$$;

-- Join codes avoid look-alike characters (0/O, 1/I/L).
create function private.gen_join_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1), '')
  from generate_series(1, 6)
$$;

alter table public.classes alter column join_code set default private.gen_join_code();

grant execute on all functions in schema private to authenticated, service_role;

-- ── Student settings and guardian controls ───────────────────────────────

create table public.student_settings (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  bedtime_start smallint not null default 1320 check (bedtime_start between 0 and 1439),
  bedtime_end smallint not null default 360 check (bedtime_end between 0 and 1439),
  bedtime_days text not null default 'school' check (bedtime_days in ('school', 'weekends', 'every')),
  limit_style text not null default 'adaptive' check (limit_style in ('adaptive', 'fixed')),
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.guardian_controls (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  lock_enabled boolean not null default false,
  lock_start smallint not null default 1320 check (lock_start between 0 and 1439),
  lock_end smallint not null default 360 check (lock_end between 0 and 1439),
  late_alerts boolean not null default true,
  unlock_until timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- ── Learning ──────────────────────────────────────────────────────────────

create table public.progress (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  coins int not null default 0 check (coins >= 0),
  answers int not null default 0,
  breaks_total int not null default 0,
  built text[] not null default array['bahay'],
  stats jsonb not null default '{}'::jsonb,
  offline text[] not null default '{}',
  saved text[] not null default '{}',
  onboarded boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.mastery (
  student_id uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null,
  p real not null check (p between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);

create table public.mastery_daily (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  skill_id text not null,
  p real not null check (p between 0 and 1),
  primary key (student_id, day, skill_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id text not null,
  question_id text not null,
  skill_id text not null,
  chosen smallint not null,
  correct boolean not null,
  seconds smallint not null default 0,
  hints smallint not null default 0,
  context text not null default 'quiz' check (context in ('quiz', 'break', 'pretest', 'feed')),
  created_at timestamptz not null default now(),
  unique (student_id, client_id)
);
create index attempts_student_time_idx on public.attempts (student_id, created_at desc);

create table public.tutor_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_id text not null,
  wrong_index smallint not null,
  lang text not null default 'en',
  misconception text not null default 'unknown',
  content jsonb not null,
  confidence real not null check (confidence between 0 and 1),
  source text not null check (source in ('bank', 'generated')),
  model text,
  status text not null default 'auto' check (status in ('auto', 'needs_review', 'approved', 'edited')),
  teacher_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index tutor_answers_student_idx on public.tutor_answers (student_id, created_at desc);
create index tutor_answers_review_idx on public.tutor_answers (status) where status = 'needs_review';

-- ── Habits ────────────────────────────────────────────────────────────────

create table public.usage_daily (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  total_min int not null default 0,
  video_min int not null default 0,
  social_min int not null default 0,
  games_min int not null default 0,
  late_min int not null default 0,
  sessions int not null default 0,
  unlocks int not null default 0,
  off_at smallint,
  breaks int not null default 0,
  learning_min int not null default 0,
  source text not null default 'app' check (source in ('app', 'android', 'ios')),
  updated_at timestamptz not null default now(),
  primary key (student_id, day)
);

create table public.nudge_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id text not null,
  at timestamptz not null default now(),
  level text not null check (level in ('checkin', 'break', 'winddown', 'lock')),
  reasons jsonb not null default '[]'::jsonb,
  response text not null default 'quiet'
    check (response in ('took', 'snoozed', 'followed', 'locked', 'requested', 'quiet')),
  source text not null default 'app' check (source in ('app', 'android', 'ios')),
  unique (student_id, client_id)
);
create index nudge_events_student_time_idx on public.nudge_events (student_id, at desc);

create table public.time_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  minutes smallint not null default 15 check (minutes between 5 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null
);
create index time_requests_student_idx on public.time_requests (student_id, created_at desc);

-- ── Devices ───────────────────────────────────────────────────────────────

create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- Background monitors (Android service, iOS extension) report with a device
-- token instead of a user session. Only its hash is stored.
create table private.device_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

-- ── Row level security ────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.guardian_links enable row level security;
alter table public.link_codes enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.student_settings enable row level security;
alter table public.guardian_controls enable row level security;
alter table public.progress enable row level security;
alter table public.mastery enable row level security;
alter table public.mastery_daily enable row level security;
alter table public.attempts enable row level security;
alter table public.tutor_answers enable row level security;
alter table public.usage_daily enable row level security;
alter table public.nudge_events enable row level security;
alter table public.time_requests enable row level security;
alter table public.push_tokens enable row level security;
alter table private.link_attempts enable row level security;
alter table private.device_tokens enable row level security;

-- profiles
create policy "profiles: read self and linked people" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_guardian_of(id)
    or private.is_teacher_of(id)
    or private.is_adult_of_me(id)
  );
create policy "profiles: insert self" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- guardian_links: created only through link_student(); either side may unlink.
create policy "links: read own" on public.guardian_links for select to authenticated
  using (guardian_id = (select auth.uid()) or student_id = (select auth.uid()));
create policy "links: either side unlinks" on public.guardian_links for delete to authenticated
  using (guardian_id = (select auth.uid()) or student_id = (select auth.uid()));

-- link_codes: only the student sees their own code.
create policy "link codes: read own" on public.link_codes for select to authenticated
  using (student_id = (select auth.uid()));

-- classes
create policy "classes: teacher and members read" on public.classes for select to authenticated
  using (teacher_id = (select auth.uid()) or private.is_member_of(id));
create policy "classes: teachers create" on public.classes for insert to authenticated
  with check (teacher_id = (select auth.uid()) and private.my_role() = 'teacher');
create policy "classes: teacher updates" on public.classes for update to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "classes: teacher deletes" on public.classes for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- class_members: joined only through join_class().
create policy "members: student and teacher read" on public.class_members for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );
create policy "members: student leaves or teacher removes" on public.class_members for delete to authenticated
  using (
    student_id = (select auth.uid())
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );

-- student_settings: student and their guardians.
create policy "settings: read" on public.student_settings for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "settings: insert" on public.student_settings for insert to authenticated
  with check (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "settings: update" on public.student_settings for update to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id))
  with check (student_id = (select auth.uid()) or private.is_guardian_of(student_id));

-- guardian_controls: student reads; only guardians change.
create policy "controls: read" on public.guardian_controls for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "controls: guardian insert" on public.guardian_controls for insert to authenticated
  with check (private.is_guardian_of(student_id));
create policy "controls: guardian update" on public.guardian_controls for update to authenticated
  using (private.is_guardian_of(student_id)) with check (private.is_guardian_of(student_id));

-- progress: student only.
create policy "progress: own" on public.progress for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- mastery / mastery_daily / attempts: student writes, teacher reads.
create policy "mastery: read" on public.mastery for select to authenticated
  using (student_id = (select auth.uid()) or private.is_teacher_of(student_id));
create policy "mastery: write own" on public.mastery for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "mastery: update own" on public.mastery for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "mastery daily: read" on public.mastery_daily for select to authenticated
  using (student_id = (select auth.uid()) or private.is_teacher_of(student_id));
create policy "mastery daily: write own" on public.mastery_daily for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "mastery daily: update own" on public.mastery_daily for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "attempts: read" on public.attempts for select to authenticated
  using (student_id = (select auth.uid()) or private.is_teacher_of(student_id));
create policy "attempts: insert own" on public.attempts for insert to authenticated
  with check (student_id = (select auth.uid()));

-- tutor_answers: student reads and flags own; teacher reviews.
create policy "tutor: read" on public.tutor_answers for select to authenticated
  using (student_id = (select auth.uid()) or private.is_teacher_of(student_id));
create policy "tutor: student inserts own" on public.tutor_answers for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "tutor: teacher reviews" on public.tutor_answers for update to authenticated
  using (private.is_teacher_of(student_id)) with check (private.is_teacher_of(student_id));

-- usage_daily / nudge_events: student writes, guardian reads.
create policy "usage: read" on public.usage_daily for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "usage: insert own" on public.usage_daily for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "usage: update own" on public.usage_daily for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "nudges: read" on public.nudge_events for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "nudges: insert own" on public.nudge_events for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "nudges: update own" on public.nudge_events for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- time_requests: student asks; decisions go through decide_request().
create policy "requests: read" on public.time_requests for select to authenticated
  using (student_id = (select auth.uid()) or private.is_guardian_of(student_id));
create policy "requests: student asks" on public.time_requests for insert to authenticated
  with check (student_id = (select auth.uid()) and status = 'pending');

-- push_tokens: own; registration goes through register_push_token().
create policy "push: read own" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push: delete own" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Grants (new tables are not exposed to the API automatically) ─────────

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all tables in schema private to service_role;

-- Column-limited updates.
revoke update on public.profiles from authenticated;
grant update (display_name, grade, lang) on public.profiles to authenticated;
revoke update on public.tutor_answers from authenticated;
grant update (status, teacher_note, reviewed_by, reviewed_at) on public.tutor_answers to authenticated;
revoke update, insert on public.time_requests from authenticated;
grant insert (minutes) on public.time_requests to authenticated;
revoke insert, update on public.link_codes, public.guardian_links, public.class_members from authenticated;
revoke update on public.attempts from authenticated;
revoke insert, update on public.push_tokens from authenticated;

-- ── New users ─────────────────────────────────────────────────────────────

-- The role and name come from sign-up metadata once, to create the profile.
-- Nothing reads user metadata for authorization afterwards.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  n text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60);
  l text := coalesce(new.raw_user_meta_data ->> 'lang', 'en');
  g smallint := nullif(new.raw_user_meta_data ->> 'grade', '')::smallint;
begin
  if r not in ('student', 'guardian', 'teacher') then r := 'student'; end if;
  if l not in ('en', 'fil') then l := 'en'; end if;
  if g is not null and (g < 7 or g > 12) then g := null; end if;
  insert into public.profiles (id, role, display_name, grade, lang) values (new.id, r, n, g, l);
  if r = 'student' then
    insert into public.student_settings (student_id) values (new.id);
    insert into public.progress (student_id) values (new.id);
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── RPCs ──────────────────────────────────────────────────────────────────

create function public.my_link_code(regenerate boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  c text;
begin
  if uid is null or private.my_role() <> 'student' then
    raise exception 'Only students have a link code' using errcode = '42501';
  end if;
  if regenerate then delete from public.link_codes where student_id = uid; end if;
  select code into c from public.link_codes where student_id = uid;
  if c is not null then return c; end if;
  loop
    c := private.gen_digits(6);
    begin
      insert into public.link_codes (student_id, code) values (uid, c);
      return c;
    exception when unique_violation then
      -- try another code
    end;
  end loop;
end $$;

create function public.link_student(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  sid uuid;
  sname text;
begin
  if uid is null or private.my_role() <> 'guardian' then
    raise exception 'Only guardians can link to a student' using errcode = '42501';
  end if;
  -- At most 10 tries per hour, so codes can't be guessed.
  if (select count(*) from private.link_attempts where user_id = uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many tries. Wait an hour and try again.' using errcode = 'P0001';
  end if;
  select student_id into sid from public.link_codes where code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  if sid is null then
    insert into private.link_attempts (user_id) values (uid);
    raise exception 'That code doesn''t match a student' using errcode = 'P0002';
  end if;
  insert into public.guardian_links (guardian_id, student_id) values (uid, sid) on conflict do nothing;
  insert into public.guardian_controls (student_id, updated_by) values (sid, uid) on conflict do nothing;
  select display_name into sname from public.profiles where id = sid;
  return json_build_object('student_id', sid, 'name', sname);
end $$;

create function public.join_class(p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  cl public.classes;
begin
  if uid is null or private.my_role() <> 'student' then
    raise exception 'Only students can join a class' using errcode = '42501';
  end if;
  if (select count(*) from private.link_attempts where user_id = uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many tries. Wait an hour and try again.' using errcode = 'P0001';
  end if;
  select * into cl from public.classes where join_code = upper(trim(coalesce(p_code, '')));
  if cl.id is null then
    insert into private.link_attempts (user_id) values (uid);
    raise exception 'That class code doesn''t exist' using errcode = 'P0002';
  end if;
  insert into public.class_members (class_id, student_id) values (cl.id, uid) on conflict do nothing;
  return json_build_object('class_id', cl.id, 'name', cl.name, 'grade', cl.grade);
end $$;

create function public.decide_request(p_id uuid, p_approve boolean) returns public.time_requests
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  r public.time_requests;
begin
  select * into r from public.time_requests where id = p_id for update;
  if r.id is null or not private.is_guardian_of(r.student_id) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if r.status <> 'pending' then return r; end if;
  update public.time_requests
    set status = case when p_approve then 'approved' else 'declined' end,
        decided_at = now(), decided_by = uid
    where id = p_id returning * into r;
  if p_approve then
    insert into public.guardian_controls (student_id, unlock_until, updated_by, updated_at)
      values (r.student_id, now() + make_interval(mins => r.minutes), uid, now())
    on conflict (student_id) do update
      set unlock_until = greatest(coalesce(public.guardian_controls.unlock_until, now()), now())
                         + make_interval(mins => r.minutes),
          updated_by = uid, updated_at = now();
  end if;
  return r;
end $$;

create function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_platform not in ('ios', 'android', 'web') or char_length(p_token) > 300 then
    raise exception 'Bad token' using errcode = '22023';
  end if;
  insert into public.push_tokens (token, user_id, platform, updated_at) values (p_token, uid, p_platform, now())
  on conflict (token) do update set user_id = uid, platform = p_platform, updated_at = now();
end $$;

create function public.create_device_token(p_platform text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  raw text;
begin
  if uid is null or private.my_role() <> 'student' then
    raise exception 'Only students can register a monitor' using errcode = '42501';
  end if;
  raw := encode(extensions.gen_random_bytes(32), 'hex');
  -- Keep the three newest devices.
  delete from private.device_tokens where id in (
    select id from private.device_tokens where student_id = uid order by created_at desc offset 2
  );
  insert into private.device_tokens (student_id, token_hash, platform)
    values (uid, encode(extensions.digest(raw, 'sha256'), 'hex'), p_platform);
  return raw;
end $$;

revoke execute on function public.my_link_code(boolean), public.link_student(text), public.join_class(text),
  public.decide_request(uuid, boolean), public.register_push_token(text, text), public.create_device_token(text)
  from public, anon;
grant execute on function public.my_link_code(boolean), public.link_student(text), public.join_class(text),
  public.decide_request(uuid, boolean), public.register_push_token(text, text), public.create_device_token(text)
  to authenticated;

-- ── Realtime ──────────────────────────────────────────────────────────────

alter publication supabase_realtime add table
  public.time_requests,
  public.guardian_controls,
  public.student_settings,
  public.guardian_links,
  public.class_members,
  public.mastery,
  public.tutor_answers,
  public.nudge_events,
  public.usage_daily;

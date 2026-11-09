-- Helpers for edge functions. Only the service role may call these.

-- Throttle log for tutor calls and guardian alerts.
create table private.rate_log (
  user_id uuid not null,
  kind text not null,
  at timestamptz not null default now()
);
create index rate_log_idx on private.rate_log (user_id, kind, at desc);
alter table private.rate_log enable row level security;
grant all on private.rate_log to service_role;

-- Returns true and records the hit when `user_id` has fewer than `max_hits`
-- of `kind` within `window_s` seconds.
create function public.rate_take(p_user uuid, p_kind text, p_max int, p_window_s int) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.rate_log
      where user_id = p_user and kind = p_kind and at > now() - make_interval(secs => p_window_s)) >= p_max then
    return false;
  end if;
  insert into private.rate_log (user_id, kind) values (p_user, p_kind);
  delete from private.rate_log where at < now() - interval '2 days';
  return true;
end $$;

-- Background monitors authenticate with a device token; look up its student.
create function public.device_student(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid;
begin
  update private.device_tokens set last_seen = now()
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    returning student_id into sid;
  return sid;
end $$;

revoke execute on function public.rate_take(uuid, text, int, int), public.device_student(text) from public, anon, authenticated;
grant execute on function public.rate_take(uuid, text, int, int), public.device_student(text) to service_role;

-- Guardian-set limits: minutes of continuous scrolling (video + social apps)
-- and of games before the student's phone sends a break nudge. Null = off,
-- and the adaptive risk model decides instead.
alter table public.guardian_controls
  add column scroll_limit smallint check (scroll_limit between 5 and 240),
  add column games_limit smallint check (games_limit between 5 and 240);

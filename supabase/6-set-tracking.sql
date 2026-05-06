-- Per-set tracking: notes column on set_logs + unique constraint so we can
-- upsert (re-saving the same set updates instead of creating a duplicate).

set role postgres;

alter table public.set_logs add column if not exists notes text;

alter table public.set_logs
  add constraint unique_set_per_exercise
  unique (workout_exercise_id, set_number);

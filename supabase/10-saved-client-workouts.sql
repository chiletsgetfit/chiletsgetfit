-- Client-saved workout templates. When a client does a custom session and
-- wants to repeat it, they save it here. It then shows up in "Pick today's
-- session" on /app alongside their program days.

set role postgres;

create table public.saved_client_workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index idx_saved_client_workouts_client
  on public.saved_client_workouts(client_id, created_at desc);

create table public.saved_client_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  saved_workout_id uuid not null references public.saved_client_workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null,
  target_sets int not null default 3,
  target_reps text,
  target_weight numeric(6,2),
  rest_seconds int,
  notes text
);
create index idx_saved_workout_exercises_saved
  on public.saved_client_workout_exercises(saved_workout_id, position);

alter table public.saved_client_workouts enable row level security;
alter table public.saved_client_workout_exercises enable row level security;

create policy "clients manage own saved workouts"
  on public.saved_client_workouts
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "admins read saved workouts"
  on public.saved_client_workouts
  for select to authenticated
  using (public.is_admin());

create policy "clients manage own saved workout exercises"
  on public.saved_client_workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.saved_client_workouts s
      where s.id = saved_client_workout_exercises.saved_workout_id
        and s.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.saved_client_workouts s
      where s.id = saved_client_workout_exercises.saved_workout_id
        and s.client_id = auth.uid()
    )
  );

create policy "admins read saved workout exercises"
  on public.saved_client_workout_exercises
  for select to authenticated
  using (public.is_admin());

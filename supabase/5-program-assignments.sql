-- Assign a program to a client. One active assignment per client at a time
-- (enforced by partial unique index). Old assignment is closed by setting
-- ended_at when a new one is created.

set role postgres;

create table public.client_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  target_per_week int not null default 3 check (target_per_week between 1 and 7),
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);
create index idx_client_programs_client on public.client_programs(client_id, started_at desc);
create unique index uniq_active_program_per_client
  on public.client_programs(client_id) where ended_at is null;

-- Tag a workout with the program day it came from + the assignment, so we
-- can count weekly progress and recommend the next day.
alter table public.workouts
  add column program_day_id uuid references public.program_days(id) on delete set null;
alter table public.workouts
  add column client_program_id uuid references public.client_programs(id) on delete set null;
create index idx_workouts_client_completed
  on public.workouts(client_id, completed_at desc);

-- =============================================================
-- RLS
-- =============================================================

alter table public.client_programs enable row level security;

create policy "admins manage client_programs" on public.client_programs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "clients read their own assignment" on public.client_programs
  for select to authenticated
  using (client_id = auth.uid());

-- Now that we have assignments, clients also need read access to the program
-- they're on (and its days + day exercises) so the client portal can render.

create policy "clients read assigned programs" on public.programs
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.client_programs cp
      where cp.program_id = programs.id
        and cp.client_id = auth.uid()
        and cp.ended_at is null
    )
  );

create policy "clients read assigned program_days" on public.program_days
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.client_programs cp
      where cp.program_id = program_days.program_id
        and cp.client_id = auth.uid()
        and cp.ended_at is null
    )
  );

create policy "clients read assigned program_day_exercises"
  on public.program_day_exercises
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.program_days pd
      join public.client_programs cp on cp.program_id = pd.program_id
      where pd.id = program_day_exercises.program_day_id
        and cp.client_id = auth.uid()
        and cp.ended_at is null
    )
  );

-- Clients need to be able to START a workout themselves (when they pick a
-- day from their program in the client portal).
create policy "clients start their own workouts" on public.workouts
  for insert to authenticated
  with check (client_id = auth.uid());

create policy "clients add exercises to their own workouts"
  on public.workout_exercises
  for insert to authenticated
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.client_id = auth.uid()
    )
  );

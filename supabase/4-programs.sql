-- Programs (templates the coach builds, e.g. "PPL", "Upper/Lower 4-day")
-- A program has Days (Push, Pull, Legs); each Day has prescribed exercises.

-- If your SQL editor session is running as a restricted role, escalate first.
-- (Safe to leave; no-op when already postgres.)
set role postgres;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  days_per_week int not null default 3 check (days_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_programs_coach on public.programs(coach_id);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  position int not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (program_id, position)
);
create index idx_program_days_program on public.program_days(program_id, position);

create table public.program_day_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null,
  target_sets int not null default 3,
  target_reps text,
  target_weight numeric(6,2),
  rest_seconds int,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_program_day_exercises_day
  on public.program_day_exercises(program_day_id, position);

-- =============================================================
-- RLS
-- =============================================================

alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_day_exercises enable row level security;

-- Admins do everything. Clients will gain read access in a later migration
-- when we wire up program assignment.

create policy "admins manage programs" on public.programs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage program_days" on public.program_days
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins manage program_day_exercises" on public.program_day_exercises
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

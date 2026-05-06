-- ChiletsGetFit database schema (v1)
-- Paste this whole file into Supabase SQL Editor → Run.

-- =============================================================
-- 1. Tables
-- =============================================================

-- profiles: extends auth.users with role + name
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'client' check (role in ('admin', 'client')),
  coach_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- exercises: shared library, managed by admins
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text,
  instructions text,
  created_at timestamptz not null default now()
);

-- workouts: a session assigned to a client
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  scheduled_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_workouts_client_date
  on public.workouts(client_id, scheduled_date desc);

-- workout_exercises: prescribed exercises within a workout
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null,
  target_sets int not null default 3,
  target_reps text,
  target_weight numeric,
  rest_seconds int,
  notes text
);
create index idx_workout_exercises_workout
  on public.workout_exercises(workout_id, position);

-- set_logs: each completed set
create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number int not null,
  reps int,
  weight numeric,
  completed_at timestamptz not null default now()
);
create index idx_set_logs_we
  on public.set_logs(workout_exercise_id, set_number);

-- =============================================================
-- 2. Auto-create profile when a new auth.users row appears
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 3. Helpers used by RLS policies
-- =============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- =============================================================
-- 4. Row Level Security
-- =============================================================

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.set_logs enable row level security;

-- profiles
create policy "read own profile or any if admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "update own profile but not role" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

create policy "admins manage all profiles" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- exercises
create policy "any authenticated user can read exercises" on public.exercises
  for select to authenticated using (true);

create policy "only admins manage exercises" on public.exercises
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- workouts
create policy "clients read their own workouts" on public.workouts
  for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "clients can mark their workouts complete" on public.workouts
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "admins manage all workouts" on public.workouts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- workout_exercises
create policy "read workout_exercises if workout is mine or admin"
  on public.workout_exercises
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.client_id = auth.uid()
    )
  );

create policy "admins manage workout_exercises" on public.workout_exercises
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- set_logs
create policy "read set_logs for own workouts or admin" on public.set_logs
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id and w.client_id = auth.uid()
    )
  );

create policy "clients log sets on their own workouts" on public.set_logs
  for insert to authenticated
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id and w.client_id = auth.uid()
    )
  );

create policy "clients update their own set_logs" on public.set_logs
  for update to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id and w.client_id = auth.uid()
    )
  );

create policy "clients delete their own set_logs" on public.set_logs
  for delete to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = set_logs.workout_exercise_id and w.client_id = auth.uid()
    )
  );

create policy "admins manage all set_logs" on public.set_logs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

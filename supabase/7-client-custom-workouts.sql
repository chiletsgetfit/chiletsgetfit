-- Clients can build custom workouts (not tied to a program day) and add /
-- remove exercises from any workout they own.

set role postgres;

create policy "clients remove exercises from own workouts"
  on public.workout_exercises
  for delete to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and w.client_id = auth.uid()
    )
  );

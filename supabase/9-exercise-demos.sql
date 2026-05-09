-- Demo images (start + end frames) for each exercise. Animated client-side
-- to fake a GIF so the client can tap to see proper form mid-workout.

set role postgres;

alter table public.exercises
  add column if not exists demo_images text[] not null default '{}'::text[];

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeWorkout } from "../../actions";

export default async function ClientWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      "id, name, scheduled_date, completed_at, notes, client_id, workout_exercises ( id, position, target_sets, target_reps, target_weight, rest_seconds, notes, exercises ( id, name, muscle_group ) )"
    )
    .eq("id", id)
    .single();

  if (!workout || workout.client_id !== user!.id) notFound();

  const exercises = [...(workout.workout_exercises ?? [])].sort(
    (a, b) => a.position - b.position
  );

  // Last-time prescription per exercise (most recent prior workout that included it)
  const exerciseIds = exercises
    .map((we) => {
      const ex = Array.isArray(we.exercises) ? we.exercises[0] : we.exercises;
      return ex?.id;
    })
    .filter((x): x is string => Boolean(x));

  const lastByExercise = new Map<
    string,
    { date: string; sets: number; reps: string | null; weight: number | null }
  >();
  if (exerciseIds.length > 0) {
    const { data: priors } = await supabase
      .from("workout_exercises")
      .select(
        "exercise_id, target_sets, target_reps, target_weight, workouts!inner ( id, completed_at, client_id )"
      )
      .eq("workouts.client_id", user!.id)
      .in("exercise_id", exerciseIds)
      .not("workouts.completed_at", "is", null)
      .neq("workout_id", id)
      .order("workouts(completed_at)", { ascending: false });

    for (const row of priors ?? []) {
      if (lastByExercise.has(row.exercise_id)) continue;
      const w = Array.isArray(row.workouts) ? row.workouts[0] : row.workouts;
      if (!w?.completed_at) continue;
      lastByExercise.set(row.exercise_id, {
        date: w.completed_at,
        sets: row.target_sets,
        reps: row.target_reps,
        weight: row.target_weight,
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/app"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {workout.name}
        </h1>
        {workout.completed_at ? (
          <p className="mt-2 text-sm text-emerald-300">
            Completed{" "}
            {new Date(workout.completed_at).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">
            Today&apos;s session — hit it and mark complete.
          </p>
        )}
        {workout.notes && (
          <p className="mt-3 text-sm text-zinc-300">{workout.notes}</p>
        )}
      </header>

      <ol className="mt-8 space-y-3">
        {exercises.map((we, idx) => {
          const ex = Array.isArray(we.exercises) ? we.exercises[0] : we.exercises;
          const last = ex ? lastByExercise.get(ex.id) : undefined;
          return (
            <li
              key={we.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                {idx + 1}
                {ex?.muscle_group && ` · ${ex.muscle_group}`}
              </p>
              <p className="mt-1 text-lg font-medium text-white">
                {ex?.name ?? "(deleted exercise)"}
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                <span className="text-gold-400">{we.target_sets} sets</span>
                {we.target_reps && (
                  <>
                    {" "}× <span>{we.target_reps} reps</span>
                  </>
                )}
                {we.target_weight !== null && (
                  <>
                    {" "}@{" "}
                    <span className="text-zinc-200">
                      {we.target_weight} lbs
                    </span>
                  </>
                )}
                {we.rest_seconds && (
                  <>
                    {" "}· rest{" "}
                    <span className="text-zinc-400">{we.rest_seconds}s</span>
                  </>
                )}
              </p>
              {we.notes && (
                <p className="mt-2 text-sm text-zinc-400">{we.notes}</p>
              )}
              {last && (
                <p className="mt-3 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-zinc-500">
                  <span className="text-zinc-400">Last time:</span>{" "}
                  {last.sets}x{last.reps ?? "?"}
                  {last.weight !== null && ` @ ${last.weight} lbs`}{" "}
                  <span className="text-zinc-600">
                    ({new Date(last.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })})
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!workout.completed_at && (
        <form action={completeWorkout} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="w-full rounded-full bg-gold-500 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-black transition-colors hover:bg-gold-400"
          >
            Mark workout complete
          </button>
        </form>
      )}
    </div>
  );
}

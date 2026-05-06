import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddExerciseForm } from "./AddExerciseForm";
import { deleteWorkout, removeWorkoutExercise } from "../actions";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: workout }, { data: exercises }, { data: library }] =
    await Promise.all([
      supabase
        .from("workouts")
        .select(
          "id, name, scheduled_date, notes, completed_at, client_id, profiles!workouts_client_id_fkey ( full_name, email )"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("workout_exercises")
        .select(
          "id, position, target_sets, target_reps, target_weight, rest_seconds, notes, exercises ( id, name, muscle_group )"
        )
        .eq("workout_id", id)
        .order("position"),
      supabase
        .from("exercises")
        .select("id, name, muscle_group")
        .order("name"),
    ]);

  if (!workout) notFound();

  const profile = Array.isArray(workout.profiles)
    ? workout.profiles[0]
    : workout.profiles;
  const clientName =
    profile?.full_name ?? profile?.email ?? "Unknown client";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/workouts"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to workouts
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {workout.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            For <span className="text-zinc-200">{clientName}</span>
            {workout.scheduled_date && (
              <>
                {" "}· scheduled{" "}
                <span className="text-zinc-200">
                  {new Date(workout.scheduled_date).toLocaleDateString(
                    undefined,
                    { weekday: "long", month: "long", day: "numeric" }
                  )}
                </span>
              </>
            )}
          </p>
          {workout.notes && (
            <p className="mt-3 text-sm text-zinc-300">{workout.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/workouts/${id}/edit`}
            className="inline-flex h-9 items-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200 transition-colors hover:border-gold-400 hover:text-gold-400"
          >
            Edit
          </Link>
          <form action={deleteWorkout}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-full border border-zinc-800 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:border-red-700 hover:text-red-400"
            >
              Delete
            </button>
          </form>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
          Exercises
        </h2>

        {exercises && exercises.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {exercises.map((we, idx) => {
              const ex = Array.isArray(we.exercises)
                ? we.exercises[0]
                : we.exercises;
              return (
                <li
                  key={we.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        {idx + 1}
                        {ex?.muscle_group && ` · ${ex.muscle_group}`}
                      </p>
                      <p className="mt-1 text-lg font-medium text-white">
                        {ex?.name ?? "(deleted exercise)"}
                      </p>
                      <p className="mt-2 text-sm text-zinc-300">
                        <span className="text-gold-400">
                          {we.target_sets} sets
                        </span>
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
                            <span className="text-zinc-400">
                              {we.rest_seconds}s
                            </span>
                          </>
                        )}
                      </p>
                      {we.notes && (
                        <p className="mt-2 text-sm text-zinc-400">{we.notes}</p>
                      )}
                    </div>
                    <form action={removeWorkoutExercise}>
                      <input type="hidden" name="id" value={we.id} />
                      <input type="hidden" name="workout_id" value={id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
            No exercises yet. Add the first one below.
          </p>
        )}
      </section>

      <section className="mt-8">
        <AddExerciseForm workoutId={id} exercises={library ?? []} />
      </section>
    </div>
  );
}

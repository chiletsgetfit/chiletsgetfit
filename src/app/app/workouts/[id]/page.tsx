import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  clearSet,
  completeWorkout,
  logSet,
  removeExerciseFromMyWorkout,
} from "../../actions";
import { AddExerciseForm } from "./AddExerciseForm";
import { ExerciseDemo } from "@/components/ExerciseDemo";

type SetLog = {
  id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  notes: string | null;
  completed_at: string;
};

type ExerciseRel = {
  id: string;
  name: string;
  muscle_group: string | null;
  demo_images: string[] | null;
  video_url: string | null;
};

type WorkoutExercise = {
  id: string;
  position: number;
  target_sets: number;
  target_reps: string | null;
  target_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: ExerciseRel | ExerciseRel[] | null;
  set_logs: SetLog[];
};

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
      "id, name, scheduled_date, completed_at, notes, client_id, workout_exercises ( id, position, target_sets, target_reps, target_weight, rest_seconds, notes, exercises ( id, name, muscle_group, demo_images, video_url ), set_logs ( id, set_number, reps, weight, notes, completed_at ) )"
    )
    .eq("id", id)
    .single();

  if (!workout || workout.client_id !== user!.id) notFound();

  const exercises: WorkoutExercise[] = [
    ...(workout.workout_exercises ?? []),
  ].sort((a, b) => a.position - b.position);

  // Library for the "+ Add exercise" form (only fetched when needed).
  const inProgress = !workout.completed_at;
  const { data: library } = inProgress
    ? await supabase
        .from("exercises")
        .select("id, name, muscle_group")
        .order("name")
    : { data: null };

  // Last-time *actual* logged sets per exercise (most recent prior completed
  // workout where this exercise had at least one logged set).
  const exerciseIds = exercises
    .map((we) => {
      const ex = Array.isArray(we.exercises) ? we.exercises[0] : we.exercises;
      return ex?.id;
    })
    .filter((x): x is string => Boolean(x));

  type LastSet = {
    set_number: number;
    reps: number | null;
    weight: number | null;
    notes: string | null;
  };
  const lastByExercise = new Map<
    string,
    { date: string; sets: LastSet[] }
  >();

  if (exerciseIds.length > 0) {
    const { data: priorSets } = await supabase
      .from("set_logs")
      .select(
        "set_number, reps, weight, notes, workout_exercises!inner ( exercise_id, workout_id, workouts!inner ( client_id, completed_at ) )"
      )
      .eq("workout_exercises.workouts.client_id", user!.id)
      .in("workout_exercises.exercise_id", exerciseIds)
      .neq("workout_exercises.workout_id", id)
      .not("workout_exercises.workouts.completed_at", "is", null);

    // Group rows by (exercise_id, workout_id), then pick the most recent
    // workout per exercise.
    const grouped = new Map<
      string,
      Map<string, { date: string; sets: LastSet[] }>
    >();
    for (const row of priorSets ?? []) {
      const we = Array.isArray(row.workout_exercises)
        ? row.workout_exercises[0]
        : row.workout_exercises;
      if (!we) continue;
      const w = Array.isArray(we.workouts) ? we.workouts[0] : we.workouts;
      if (!w?.completed_at) continue;
      const exId = we.exercise_id;
      const wId = we.workout_id;
      let byWorkout = grouped.get(exId);
      if (!byWorkout) {
        byWorkout = new Map();
        grouped.set(exId, byWorkout);
      }
      let entry = byWorkout.get(wId);
      if (!entry) {
        entry = { date: w.completed_at, sets: [] };
        byWorkout.set(wId, entry);
      }
      entry.sets.push({
        set_number: row.set_number,
        reps: row.reps,
        weight: row.weight,
        notes: row.notes,
      });
    }

    for (const [exId, byWorkout] of grouped) {
      let best: { date: string; sets: LastSet[] } | null = null;
      for (const entry of byWorkout.values()) {
        if (!best || entry.date > best.date) best = entry;
      }
      if (best) {
        best.sets.sort((a, b) => a.set_number - b.set_number);
        lastByExercise.set(exId, best);
      }
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
            Log each set as you go. Hit complete when you&apos;re done.
          </p>
        )}
        {workout.notes && (
          <p className="mt-3 text-sm text-zinc-300">{workout.notes}</p>
        )}
      </header>

      <ol className="mt-8 space-y-4">
        {exercises.map((we, idx) => {
          const ex = Array.isArray(we.exercises)
            ? we.exercises[0]
            : we.exercises;
          const last = ex ? lastByExercise.get(ex.id) : undefined;
          const logs = [...(we.set_logs ?? [])].sort(
            (a, b) => a.set_number - b.set_number
          );
          const logsByNumber = new Map(logs.map((l) => [l.set_number, l]));
          const totalRows = Math.max(we.target_sets, ...logs.map((l) => l.set_number));

          const canRemove = inProgress && logs.length === 0;
          return (
            <li
              key={we.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    {idx + 1}
                    {ex?.muscle_group && ` · ${ex.muscle_group}`}
                  </p>
                  <p className="mt-1 text-lg font-medium text-white">
                    {ex?.name ?? "(deleted exercise)"}
                  </p>
                </div>
                {canRemove && (
                  <form action={removeExerciseFromMyWorkout}>
                    <input type="hidden" name="id" value={we.id} />
                    <input type="hidden" name="workout_id" value={id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </div>
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
              {last && last.sets.length > 0 && (
                <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Last ·{" "}
                    {new Date(last.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {last.sets.map((s) => (
                      <li key={s.set_number} className="text-zinc-400">
                        <span className="text-zinc-600">{s.set_number}:</span>{" "}
                        <span className="text-zinc-200">
                          {s.weight !== null ? `${s.weight}` : "—"}
                        </span>
                        <span className="text-zinc-600"> × </span>
                        <span className="text-zinc-200">
                          {s.reps !== null ? `${s.reps}` : "—"}
                        </span>
                        {s.notes && (
                          <span className="text-zinc-500">
                            {" · "}
                            <span className="italic">{s.notes}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ex && (ex.video_url || (ex.demo_images && ex.demo_images.length > 0)) && (
                <ExerciseDemo
                  images={ex.demo_images ?? []}
                  videoUrl={ex.video_url}
                  alt={ex.name ?? "exercise"}
                />
              )}

              <div className="mt-5 space-y-2">
                {Array.from({ length: totalRows }).map((_, i) => {
                  const setNumber = i + 1;
                  const log = logsByNumber.get(setNumber);
                  const lastSet = last?.sets.find(
                    (s) => s.set_number === setNumber
                  );
                  return log ? (
                    <LoggedSetRow
                      key={setNumber}
                      log={log}
                      workoutId={id}
                    />
                  ) : (
                    <EmptySetRow
                      key={setNumber}
                      workoutExerciseId={we.id}
                      setNumber={setNumber}
                      placeholderWeight={
                        lastSet?.weight ?? we.target_weight
                      }
                      placeholderReps={lastSet?.reps ?? null}
                    />
                  );
                })}

                {/* Bonus set row */}
                <EmptySetRow
                  workoutExerciseId={we.id}
                  setNumber={totalRows + 1}
                  placeholderWeight={
                    last?.sets[last.sets.length - 1]?.weight ??
                    we.target_weight
                  }
                  placeholderReps={
                    last?.sets[last.sets.length - 1]?.reps ?? null
                  }
                  bonus
                />
              </div>
            </li>
          );
        })}
      </ol>

      {inProgress && (
        <div className="mt-6">
          <AddExerciseForm workoutId={id} exercises={library ?? []} />
        </div>
      )}

      {inProgress && (
        <form action={completeWorkout} className="mt-6">
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

function LoggedSetRow({
  log,
  workoutId,
}: {
  log: SetLog;
  workoutId: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-900/40 text-xs font-semibold text-emerald-200">
        {log.set_number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">
          {log.weight !== null && (
            <>
              <span className="font-semibold">{log.weight}</span>
              <span className="text-zinc-400"> lbs</span>
            </>
          )}
          {log.weight !== null && log.reps !== null && (
            <span className="text-zinc-500"> × </span>
          )}
          {log.reps !== null && (
            <>
              <span className="font-semibold">{log.reps}</span>
              <span className="text-zinc-400"> reps</span>
            </>
          )}
          {log.weight === null && log.reps === null && (
            <span className="text-zinc-500">logged</span>
          )}
        </p>
        {log.notes && (
          <p className="mt-0.5 text-xs text-zinc-400">{log.notes}</p>
        )}
      </div>
      <form action={clearSet}>
        <input type="hidden" name="id" value={log.id} />
        <input type="hidden" name="workout_id" value={workoutId} />
        <button
          type="submit"
          aria-label={`Clear set ${log.set_number}`}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400"
        >
          Clear
        </button>
      </form>
    </div>
  );
}

function EmptySetRow({
  workoutExerciseId,
  setNumber,
  placeholderWeight,
  placeholderReps,
  bonus,
}: {
  workoutExerciseId: string;
  setNumber: number;
  placeholderWeight: number | null;
  placeholderReps: number | null;
  bonus?: boolean;
}) {
  const action = logSet.bind(null, workoutExerciseId, setNumber);
  return (
    <form
      action={action}
      className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
        bonus
          ? "border-dashed border-zinc-800 bg-black/20"
          : "border-zinc-800 bg-black/40"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          bonus
            ? "border border-dashed border-zinc-700 text-zinc-500"
            : "border border-zinc-700 bg-zinc-900 text-zinc-300"
        }`}
      >
        {bonus ? "+" : setNumber}
      </span>
      <input
        name="weight"
        type="number"
        inputMode="decimal"
        step="0.5"
        placeholder={
          placeholderWeight !== null ? `${placeholderWeight}` : "lbs"
        }
        className="h-10 w-20 rounded-lg border border-zinc-800 bg-black px-2 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        aria-label="Weight"
      />
      <span className="text-zinc-600">×</span>
      <input
        name="reps"
        type="number"
        inputMode="numeric"
        placeholder={placeholderReps !== null ? `${placeholderReps}` : "reps"}
        className="h-10 w-20 rounded-lg border border-zinc-800 bg-black px-2 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        aria-label="Reps"
      />
      <input
        name="notes"
        type="text"
        placeholder={bonus ? "Bonus set notes" : "Notes (optional)"}
        className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        aria-label="Notes"
      />
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400"
      >
        Save
      </button>
    </form>
  );
}

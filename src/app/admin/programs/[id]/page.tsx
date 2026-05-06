import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddDayForm } from "./AddDayForm";
import { AddDayExerciseForm } from "./AddDayExerciseForm";
import { ImportWorkoutForm } from "./ImportWorkoutForm";
import {
  deleteProgram,
  removeProgramDay,
  removeDayExercise,
} from "../actions";

type ExerciseRow = {
  id: string;
  position: number;
  target_sets: number | null;
  target_reps: string | null;
  target_weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises:
    | { id: string; name: string; muscle_group: string | null }
    | { id: string; name: string; muscle_group: string | null }[]
    | null;
};

type DayRow = {
  id: string;
  position: number;
  name: string;
  program_day_exercises: ExerciseRow[];
};

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: program }, { data: days }, { data: library }, { data: workouts }] =
    await Promise.all([
      supabase
        .from("programs")
        .select("id, name, description, days_per_week")
        .eq("id", id)
        .single(),
      supabase
        .from("program_days")
        .select(
          "id, position, name, program_day_exercises ( id, position, target_sets, target_reps, target_weight, rest_seconds, notes, exercises ( id, name, muscle_group ) )"
        )
        .eq("program_id", id)
        .order("position"),
      supabase
        .from("exercises")
        .select("id, name, muscle_group")
        .order("name"),
      supabase
        .from("workouts")
        .select("id, name")
        .order("created_at", { ascending: false }),
    ]);

  if (!program) notFound();

  const orderedDays: DayRow[] = (days ?? []).map((d) => ({
    ...d,
    program_day_exercises: [...(d.program_day_exercises ?? [])].sort(
      (a, b) => a.position - b.position
    ),
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/programs"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to programs
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {program.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {program.days_per_week}x / week
            {program.description && (
              <>
                {" · "}
                <span className="text-zinc-300">{program.description}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/programs/${id}/edit`}
            className="inline-flex h-9 items-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200 transition-colors hover:border-gold-400 hover:text-gold-400"
          >
            Edit
          </Link>
          <form action={deleteProgram}>
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

      <section className="mt-10 space-y-6">
        {orderedDays.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-400">
            No days yet. Add your first day below (e.g. Push, Pull, Legs).
          </p>
        ) : (
          orderedDays.map((day) => (
            <DaySection
              key={day.id}
              day={day}
              programId={id}
              library={library ?? []}
            />
          ))
        )}

        <AddDayForm programId={id} />
        <ImportWorkoutForm programId={id} workouts={workouts ?? []} />
      </section>
    </div>
  );
}

function DaySection({
  day,
  programId,
  library,
}: {
  day: DayRow;
  programId: string;
  library: { id: string; name: string; muscle_group: string | null }[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-400">
            Day {day.position}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{day.name}</h2>
        </div>
        <form action={removeProgramDay}>
          <input type="hidden" name="id" value={day.id} />
          <input type="hidden" name="program_id" value={programId} />
          <button
            type="submit"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400"
          >
            Remove day
          </button>
        </form>
      </div>

      {day.program_day_exercises.length > 0 && (
        <ol className="mt-5 space-y-3">
          {day.program_day_exercises.map((we, idx) => {
            const ex = Array.isArray(we.exercises)
              ? we.exercises[0]
              : we.exercises;
            return (
              <li
                key={we.id}
                className="rounded-xl border border-zinc-800 bg-black/40 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      {idx + 1}
                      {ex?.muscle_group && ` · ${ex.muscle_group}`}
                    </p>
                    <p className="mt-1 text-base font-medium text-white">
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
                  <form action={removeDayExercise}>
                    <input type="hidden" name="id" value={we.id} />
                    <input type="hidden" name="program_id" value={programId} />
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
      )}

      <div className="mt-5">
        <AddDayExerciseForm
          programId={programId}
          programDayId={day.id}
          exercises={library}
        />
      </div>
    </div>
  );
}

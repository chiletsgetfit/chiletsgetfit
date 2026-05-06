import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteExercise } from "./actions";

const MUSCLE_GROUPS = [
  "Chest",
  "Lats",
  "Upper Back",
  "Traps",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
  "Lower Back",
  "Full Body",
];

const EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Smith Machine",
  "Trap Bar",
  "EZ Bar",
  "Plate",
  "Band",
  "Sled",
  "Other",
];

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    muscle?: string;
    equipment?: string;
    error?: string;
  }>;
}) {
  const { q = "", muscle = "", equipment = "", error } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, category")
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);
  if (muscle) query = query.eq("muscle_group", muscle);
  if (equipment) query = query.eq("equipment", equipment);

  const { data: exercises } = await query;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Library
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Exercises
          </h1>
        </div>
        <Link
          href="/admin/exercises/new"
          className="inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
        >
          + New exercise
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        method="get"
        className="mt-8 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-[1fr_180px_180px_auto]"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name..."
          className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
        <select
          name="muscle"
          defaultValue={muscle}
          className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
        >
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          name="equipment"
          defaultValue={equipment}
          className="h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
        >
          <option value="">All equipment</option>
          {EQUIPMENT.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200 transition-colors hover:border-gold-400 hover:text-gold-400"
        >
          Filter
        </button>
      </form>

      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-zinc-500">
        {exercises?.length ?? 0} {exercises?.length === 1 ? "result" : "results"}
        {(q || muscle || equipment) && (
          <>
            {" · "}
            <Link href="/admin/exercises" className="hover:text-gold-400 underline">
              clear filters
            </Link>
          </>
        )}
      </p>

      {exercises && exercises.length > 0 ? (
        <ul className="mt-3 divide-y divide-zinc-900 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {exercises.map((ex) => (
            <li
              key={ex.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <Link
                href={`/admin/exercises/${ex.id}`}
                className="group min-w-0 flex-1"
              >
                <p className="font-medium text-white group-hover:text-gold-400">
                  {ex.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  {ex.muscle_group && <Tag>{ex.muscle_group}</Tag>}
                  {ex.equipment && <Tag>{ex.equipment}</Tag>}
                  {ex.category && (
                    <span className="text-zinc-500">{ex.category}</span>
                  )}
                </div>
              </Link>
              <form action={deleteExercise}>
                <input type="hidden" name="id" value={ex.id} />
                <button
                  type="submit"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-400">
          No exercises match those filters.
        </p>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-800 bg-black px-2 py-0.5 text-zinc-300">
      {children}
    </span>
  );
}

import Link from "next/link";
import { ExerciseForm } from "../ExerciseForm";
import { createExercise } from "../actions";

export default function NewExercisePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/exercises"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to exercises
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        New exercise
      </h1>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <ExerciseForm action={createExercise} submitLabel="Create" />
      </div>
    </div>
  );
}

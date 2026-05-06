import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "../ExerciseForm";
import { updateExercise } from "../actions";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, category, instructions, video_url")
    .eq("id", id)
    .single();

  if (!exercise) notFound();

  const action = updateExercise.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/exercises"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to exercises
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Edit exercise
      </h1>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <ExerciseForm
          action={action}
          defaults={exercise}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}

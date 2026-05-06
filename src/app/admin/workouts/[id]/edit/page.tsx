import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutForm } from "../../WorkoutForm";
import { updateWorkout } from "../../actions";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: workout }, { data: clients }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, name, client_id, scheduled_date, notes")
      .eq("id", id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "client")
      .order("full_name"),
  ]);

  if (!workout) notFound();

  const action = updateWorkout.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/admin/workouts/${id}`}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to workout
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Edit workout
      </h1>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <WorkoutForm
          action={action}
          clients={clients ?? []}
          defaults={workout}
          submitLabel="Save changes"
          cancelHref={`/admin/workouts/${id}`}
        />
      </div>
    </div>
  );
}

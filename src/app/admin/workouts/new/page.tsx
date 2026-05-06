import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutForm } from "../WorkoutForm";
import { createWorkout } from "../actions";

export default async function NewWorkoutPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "client")
    .eq("active", true)
    .order("full_name");

  if (!clients || clients.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/admin/workouts"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Back to workouts
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          New workout
        </h1>
        <p className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          You don&apos;t have any active clients yet. Invite one first, then come
          back to assign them a workout.
        </p>
        <Link
          href="/admin/clients"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-gold-400"
        >
          Go to clients
        </Link>
      </div>
    );
  }

  // Skip the ensureAdmin guard at action — layout already enforces.
  void redirect; // unused, keep tree-shaker quiet

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/workouts"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to workouts
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        New workout
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Create the workout shell first, then add exercises on the next screen.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <WorkoutForm
          action={createWorkout}
          clients={clients}
          submitLabel="Create &amp; add exercises"
          cancelHref="/admin/workouts"
        />
      </div>
    </div>
  );
}

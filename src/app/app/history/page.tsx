import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function WorkoutHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      "id, name, scheduled_date, completed_at, created_at, workout_exercises ( id, set_logs ( id ) )"
    )
    .eq("client_id", user!.id)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const list = workouts ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link
          href="/app"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Today
        </Link>
        <Link
          href="/app/progress"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400 hover:text-gold-300"
        >
          Progress →
        </Link>
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Workout history
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Everything you&apos;ve done — completed sessions, plus anything
        you&apos;ve started.
      </p>

      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-400">
          No workouts yet. Start one from the home screen.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {list.map((w) => {
            const exerciseCount = (w.workout_exercises ?? []).length;
            const setCount = (w.workout_exercises ?? []).reduce(
              (sum, we) => sum + (we.set_logs?.length ?? 0),
              0
            );
            const date = w.completed_at ?? w.created_at;
            return (
              <li key={w.id}>
                <Link
                  href={`/app/workouts/${w.id}`}
                  className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-gold-400"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold text-white">
                      {w.name}
                    </p>
                    {w.completed_at ? (
                      <span className="rounded-full border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        Completed
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                        In progress
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
                    {date
                      ? new Date(date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                    {exerciseCount > 0 && (
                      <>
                        {" · "}
                        {exerciseCount}{" "}
                        {exerciseCount === 1 ? "exercise" : "exercises"}
                      </>
                    )}
                    {setCount > 0 && (
                      <>
                        {" · "}
                        {setCount} {setCount === 1 ? "set" : "sets"} logged
                      </>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      "id, name, scheduled_date, completed_at, notes, created_at, client_id, profiles!workouts_client_id_fkey ( full_name, email )"
    )
    .order("scheduled_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Programming
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Workouts
          </h1>
        </div>
        <Link
          href="/admin/workouts/new"
          className="inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
        >
          + New workout
        </Link>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-zinc-500">
        {workouts?.length ?? 0}{" "}
        {workouts?.length === 1 ? "workout" : "workouts"} total
      </p>

      {workouts && workouts.length > 0 ? (
        <ul className="mt-3 divide-y divide-zinc-900 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {workouts.map((w) => {
            const profile = Array.isArray(w.profiles)
              ? w.profiles[0]
              : w.profiles;
            const clientName =
              profile?.full_name ?? profile?.email ?? "Unknown client";
            return (
              <li key={w.id}>
                <Link
                  href={`/admin/workouts/${w.id}`}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{w.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {clientName}
                      {w.scheduled_date && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-zinc-300">
                            {new Date(w.scheduled_date).toLocaleDateString(
                              undefined,
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {w.completed_at ? (
                      <span className="rounded-full border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        Completed
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 font-semibold uppercase tracking-[0.2em] text-zinc-300">
                        Scheduled
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-sm text-zinc-400">
            No workouts yet. Build one and assign it to a client.
          </p>
          <Link
            href="/admin/workouts/new"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-gold-400"
          >
            + New workout
          </Link>
        </div>
      )}
    </div>
  );
}

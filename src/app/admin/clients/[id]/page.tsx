import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeek } from "@/lib/progress";
import { getTimeZone, loadEntries, loadTargets, sumEntries, todayIn } from "@/lib/food/server";

// Read-only mirror of a client's app: the home screen as they see it, their recent
// workouts with every logged set, saved workouts, and today's food. Nothing here
// writes to the client's account.

type SetLog = {
  id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  notes: string | null;
};
type ExerciseRef = { name: string } | { name: string }[] | null;
type WorkoutExerciseRow = {
  id: string;
  position: number;
  target_sets: number;
  target_reps: string | null;
  exercises: ExerciseRef;
  set_logs: SetLog[] | null;
};
type WorkoutRow = {
  id: string;
  name: string;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  program_day_id: string | null;
  workout_exercises: WorkoutExerciseRow[] | null;
};
type ProgramRef = { id: string; name: string; description: string | null };

const exerciseName = (ref: ExerciseRef) =>
  (Array.isArray(ref) ? ref[0]?.name : ref?.name) ?? "Exercise";

export default async function ClientViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, email, active")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();
  const firstName = client.full_name?.split(" ")[0] ?? "this client";

  const weekStart = startOfWeek();

  const [{ data: assignment }, { data: recentRows }, { data: weekRows }, { data: savedTemplates }] =
    await Promise.all([
      supabase
        .from("client_programs")
        .select("id, target_per_week, started_at, program_id, programs ( id, name, description )")
        .eq("client_id", id)
        .is("ended_at", null)
        .maybeSingle(),
      supabase
        .from("workouts")
        .select(
          "id, name, scheduled_date, completed_at, created_at, program_day_id, workout_exercises ( id, position, target_sets, target_reps, exercises ( name ), set_logs ( id, set_number, reps, weight, notes ) )"
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("workouts")
        .select("id, name, program_day_id, completed_at")
        .eq("client_id", id)
        .not("completed_at", "is", null)
        .gte("completed_at", weekStart.toISOString())
        .order("completed_at", { ascending: false }),
      supabase
        .from("saved_client_workouts")
        .select("id, name")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const program: ProgramRef | null = assignment
    ? ((Array.isArray(assignment.programs) ? assignment.programs[0] : assignment.programs) as ProgramRef | null)
    : null;

  const days = assignment
    ? ((
        await supabase
          .from("program_days")
          .select("id, position, name")
          .eq("program_id", assignment.program_id)
          .order("position")
      ).data ?? [])
    : [];

  const recent = (recentRows ?? []) as WorkoutRow[];
  const week = weekRows ?? [];
  const completedThisWeek = week.length;
  const target = assignment?.target_per_week ?? 0;
  const doneDayIds = new Set(week.map((w) => w.program_day_id).filter((x): x is string => !!x));
  const recommendation = days.find((d) => !doneDayIds.has(d.id)) ?? null;
  const lastWorkout = recent.find((w) => w.completed_at) ?? null;

  let nutrition: { kcal: number; target: number | null; items: number } | null = null;
  try {
    const today = todayIn(await getTimeZone());
    const [entries, targets] = await Promise.all([loadEntries(supabase, id, today), loadTargets(supabase, id)]);
    nutrition = { kcal: sumEntries(entries).kcal, target: targets?.kcal ?? null, items: entries.length };
  } catch {
    nutrition = null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link
          href="/admin/clients"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Clients
        </Link>
        <Link
          href={`/admin/clients/${id}/food`}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          Food log →
        </Link>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Client view</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {client.full_name ?? client.email ?? "Client"}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        {client.email}
        {client.active ? "" : " · inactive"} · A read-only mirror of what {firstName} sees in the app.
        Nothing on this page changes {firstName}&apos;s account.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Home screen mirror */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
            {firstName}&apos;s home screen
          </h2>
          <div className="mt-3 rounded-[28px] border border-zinc-800 bg-black p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              {assignment ? "This week" : "Today"}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">Hey {firstName}.</p>

            {lastWorkout?.completed_at && (
              <p className="mt-2 text-sm text-zinc-400">
                You crushed <span className="text-zinc-200">{lastWorkout.name}</span> {timeAgo(lastWorkout.completed_at)}.
              </p>
            )}

            {assignment ? (
              <>
                <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-zinc-300">
                      <span className="text-2xl font-semibold text-white">{completedThisWeek}</span>
                      <span className="text-zinc-500"> / {target} workouts</span>
                    </p>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{program?.name}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className="h-full bg-gold-500"
                      style={{ width: `${Math.min(100, target ? (completedThisWeek / target) * 100 : 0)}%` }}
                    />
                  </div>
                  {completedThisWeek >= target ? (
                    <p className="mt-3 text-sm text-emerald-300">Week hit. Anything else is bonus.</p>
                  ) : recommendation ? (
                    <p className="mt-3 text-sm text-zinc-400">
                      Let&apos;s hit <span className="text-gold-400">{recommendation.name}</span> next.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-400">
                      {target - completedThisWeek} more to hit your week — repeat a day or do a custom workout.
                    </p>
                  )}
                </div>

                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
                  Pick today&apos;s session
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {days.map((day) => {
                    const done = doneDayIds.has(day.id);
                    const recommended = recommendation?.id === day.id;
                    return (
                      <div
                        key={day.id}
                        className={`rounded-2xl border p-5 ${
                          recommended ? "border-gold-500 bg-gold-500/5" : "border-zinc-800 bg-zinc-950"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                              Day {day.position}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">{day.name}</p>
                          </div>
                          {done ? (
                            <span className="rounded-full border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                              Done
                            </span>
                          ) : recommended ? (
                            <span className="rounded-full border border-gold-500/60 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">
                              Up next
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">
                          {done ? "Do again →" : "Start →"}
                        </p>
                      </div>
                    );
                  })}
                  {(savedTemplates ?? []).map((t) => (
                    <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Saved</p>
                      <p className="mt-1 text-lg font-semibold text-white">{t.name}</p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">Start →</p>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Off-script</p>
                    <p className="mt-1 text-lg font-semibold text-white">Custom workout</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">+ Build it →</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-zinc-400">
                  Your coach hasn&apos;t assigned a program yet. You can still build a custom workout below.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(savedTemplates ?? []).map((t) => (
                    <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Saved</p>
                      <p className="mt-1 text-lg font-semibold text-white">{t.name}</p>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Off-script</p>
                    <p className="mt-1 text-lg font-semibold text-white">Custom workout</p>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-zinc-300">
                  {nutrition ? (
                    <>
                      <span className="text-2xl font-semibold text-white">{nutrition.kcal.toLocaleString()}</span>
                      <span className="text-zinc-500">
                        {nutrition.target !== null ? ` / ${nutrition.target.toLocaleString()} kcal today` : " kcal today"}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-white">Food log</span>
                  )}
                </p>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Nutrition</p>
              </div>
              <p className="mt-3 text-sm text-zinc-400">
                {nutrition
                  ? nutrition.items === 0
                    ? "Nothing logged yet today."
                    : `${nutrition.items} item${nutrition.items === 1 ? "" : "s"} logged today.`
                  : "Food tracking unavailable."}{" "}
                <Link
                  href={`/admin/clients/${id}/food`}
                  className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400 hover:text-gold-300"
                >
                  Open food log →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Recent workouts with sets */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">Recent workouts</h2>
          {recent.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
              {firstName}{" "}hasn&apos;t started a workout yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recent.map((w) => {
                const exercises = [...(w.workout_exercises ?? [])].sort((a, b) => a.position - b.position);
                const setCount = exercises.reduce((s, e) => s + (e.set_logs?.length ?? 0), 0);
                const when = w.completed_at ?? w.created_at;
                return (
                  <li key={w.id}>
                    <details className="group rounded-2xl border border-zinc-800 bg-zinc-950">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{w.name}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(when).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            {" · "}
                            {w.completed_at ? "completed" : "in progress"}
                            {" · "}
                            {exercises.length} exercise{exercises.length === 1 ? "" : "s"}, {setCount} set{setCount === 1 ? "" : "s"} logged
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 group-open:text-gold-400">
                          Sets
                        </span>
                      </summary>
                      <div className="border-t border-zinc-900 px-4 pb-4">
                        {exercises.map((e) => {
                          const sets = [...(e.set_logs ?? [])].sort((a, b) => a.set_number - b.set_number);
                          return (
                            <div key={e.id} className="pt-4">
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="text-sm font-medium text-zinc-100">{exerciseName(e.exercises)}</p>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                                  {e.target_sets} × {e.target_reps ?? "—"}
                                </p>
                              </div>
                              {sets.length === 0 ? (
                                <p className="mt-1 text-xs text-zinc-600">No sets logged.</p>
                              ) : (
                                <ul className="mt-2 space-y-1">
                                  {sets.map((s) => (
                                    <li key={s.id} className="flex items-baseline gap-3 text-sm">
                                      <span className="w-10 shrink-0 text-xs text-zinc-600">Set {s.set_number}</span>
                                      <span className="text-zinc-200">
                                        {s.reps ?? "—"} reps
                                        <span className="text-zinc-500"> · </span>
                                        {s.weight !== null ? `${s.weight} lb` : "bodyweight"}
                                      </span>
                                      {s.notes && <span className="truncate text-xs text-zinc-500">“{s.notes}”</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}

          {program?.description && (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Current program</p>
              <p className="mt-2 text-sm text-white">
                {program.name}
                <span className="text-zinc-500">
                  {" "}· {target}x / week · since {formatDateOnly(assignment!.started_at)}
                </span>
              </p>
              <p className="mt-2 text-sm text-zinc-400">{program.description}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** "2026-10-07" is a calendar date, not an instant; format it without a time-zone shift. */
function formatDateOnly(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

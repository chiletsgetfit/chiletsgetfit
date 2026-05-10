import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  deleteSavedWorkout,
  startCustomWorkout,
  startProgramDay,
  startSavedWorkout,
} from "./actions";
import { PushButton } from "./PushButton";

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function ClientDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "athlete";

  // Active program assignment.
  const { data: assignment } = await supabase
    .from("client_programs")
    .select(
      "id, target_per_week, started_at, programs ( id, name, description ), program_id"
    )
    .eq("client_id", user!.id)
    .is("ended_at", null)
    .maybeSingle();

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  // Saved templates the client built themselves.
  const { data: savedTemplates } = await supabase
    .from("saved_client_workouts")
    .select("id, name, created_at")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });
  const templates = savedTemplates ?? [];

  if (!assignment) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          Today
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Hey {firstName}.
        </h1>
        <p className="mt-2 text-zinc-400">
          Your coach hasn&apos;t assigned a program yet. You can still build a
          custom workout below.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <SavedWorkoutCard key={t.id} id={t.id} name={t.name} />
          ))}
          <CustomWorkoutCard />
        </div>

        <div className="mt-6">
          <Link
            href="/app/history"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
          >
            See past workouts →
          </Link>
        </div>

        {vapid && (
          <div className="mt-6">
            <PushButton vapidPublicKey={vapid} />
          </div>
        )}
      </div>
    );
  }

  const program = Array.isArray(assignment.programs)
    ? assignment.programs[0]
    : assignment.programs;

  // Program days for the assigned program.
  const { data: days } = await supabase
    .from("program_days")
    .select("id, position, name")
    .eq("program_id", assignment.program_id)
    .order("position");

  // Completed workouts this week.
  const weekStart = startOfWeek();
  const { data: weekWorkouts } = await supabase
    .from("workouts")
    .select("id, program_day_id, completed_at, name")
    .eq("client_id", user!.id)
    .not("completed_at", "is", null)
    .gte("completed_at", weekStart.toISOString())
    .order("completed_at", { ascending: false });

  // Most recent completed workout (any time, not just this week) — the "you crushed X" line.
  const { data: lastWorkoutArr } = await supabase
    .from("workouts")
    .select("id, name, completed_at")
    .eq("client_id", user!.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1);
  const lastWorkout = lastWorkoutArr?.[0] ?? null;

  const doneDayIds = new Set(
    (weekWorkouts ?? [])
      .map((w) => w.program_day_id)
      .filter((x): x is string => x !== null)
  );
  // Most recent completed workout per program day (this week) → for "View last" link.
  const lastWorkoutByDay = new Map<string, string>();
  for (const w of weekWorkouts ?? []) {
    if (w.program_day_id && !lastWorkoutByDay.has(w.program_day_id)) {
      lastWorkoutByDay.set(w.program_day_id, w.id);
    }
  }
  const completedThisWeek = weekWorkouts?.length ?? 0;
  const target = assignment.target_per_week;

  const remainingDays = (days ?? []).filter((d) => !doneDayIds.has(d.id));
  const recommendation = remainingDays[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        This week
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Hey {firstName}.
      </h1>

      {lastWorkout && (
        <p className="mt-2 text-sm text-zinc-400">
          You crushed{" "}
          <Link
            href={`/app/workouts/${lastWorkout.id}`}
            className="text-zinc-200 underline decoration-zinc-700 underline-offset-4 hover:decoration-gold-400 hover:text-gold-400"
          >
            {lastWorkout.name}
          </Link>{" "}
          {timeAgo(lastWorkout.completed_at!)}.
        </p>
      )}

      {/* Weekly progress */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-zinc-300">
            <span className="text-2xl font-semibold text-white">
              {completedThisWeek}
            </span>
            <span className="text-zinc-500"> / {target} workouts</span>
          </p>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            {program?.name}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full bg-gold-500 transition-all"
            style={{
              width: `${Math.min(100, (completedThisWeek / target) * 100)}%`,
            }}
          />
        </div>
        {completedThisWeek >= target ? (
          <p className="mt-3 text-sm text-emerald-300">
            Week hit. Anything else is bonus.
          </p>
        ) : recommendation ? (
          <p className="mt-3 text-sm text-zinc-400">
            Let&apos;s hit{" "}
            <span className="text-gold-400">{recommendation.name}</span> next.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            {target - completedThisWeek} more to hit your week — repeat a day
            or do a custom workout.
          </p>
        )}
      </div>

      {/* Day picker */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
        Pick today&apos;s session
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(days ?? []).map((day) => {
          const done = doneDayIds.has(day.id);
          const recommended = recommendation?.id === day.id;
          const lastWorkoutId = lastWorkoutByDay.get(day.id);
          return (
            <div
              key={day.id}
              className={`flex flex-col rounded-2xl border p-5 transition-colors ${
                recommended
                  ? "border-gold-500 bg-gold-500/5"
                  : done
                    ? "border-zinc-800 bg-zinc-950"
                    : "border-zinc-800 bg-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Day {day.position}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {day.name}
                  </p>
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
              <div className="mt-4 flex items-center justify-between gap-3">
                {done && lastWorkoutId ? (
                  <Link
                    href={`/app/workouts/${lastWorkoutId}`}
                    className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 hover:text-gold-400"
                  >
                    View last
                  </Link>
                ) : (
                  <span />
                )}
                <form action={startProgramDay}>
                  <input
                    type="hidden"
                    name="program_day_id"
                    value={day.id}
                  />
                  <button
                    type="submit"
                    className={`text-xs font-semibold uppercase tracking-[0.25em] ${
                      recommended
                        ? "text-gold-400 hover:text-gold-300"
                        : "text-zinc-300 hover:text-gold-400"
                    }`}
                  >
                    {done ? "Do again →" : "Start →"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {templates.map((t) => (
          <SavedWorkoutCard key={t.id} id={t.id} name={t.name} />
        ))}
        <CustomWorkoutCard />
      </div>

      <div className="mt-6">
        <Link
          href="/app/history"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          See past workouts →
        </Link>
      </div>

      {vapid && (
        <div className="mt-8">
          <PushButton vapidPublicKey={vapid} />
        </div>
      )}
    </div>
  );
}

function CustomWorkoutCard() {
  return (
    <form action={startCustomWorkout}>
      <button
        type="submit"
        className="group block w-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-left transition-colors hover:border-gold-400"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Off-script
        </p>
        <p className="mt-1 text-lg font-semibold text-white">
          Custom workout
        </p>
        <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 group-hover:text-gold-400">
          + Build it →
        </span>
      </button>
    </form>
  );
}

function SavedWorkoutCard({ id, name }: { id: string; name: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Saved
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{name}</p>
        </div>
        <form action={deleteSavedWorkout}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            aria-label={`Delete saved workout ${name}`}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 hover:text-red-400"
          >
            Delete
          </button>
        </form>
      </div>
      <form action={startSavedWorkout} className="mt-4">
        <input type="hidden" name="saved_workout_id" value={id} />
        <button
          type="submit"
          className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-300 hover:text-gold-400"
        >
          Start →
        </button>
      </form>
    </div>
  );
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
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

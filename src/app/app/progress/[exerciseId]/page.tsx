import Link from "next/link";
import { notFound } from "next/navigation";
import { loadClientSetLogs } from "@/lib/progress-data";
import {
  computePrs,
  formatVolume,
  sessionsForExercise,
} from "@/lib/progress";

export default async function ExerciseProgressPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const logs = await loadClientSetLogs();
  const sessions = sessionsForExercise(logs, exerciseId);
  if (sessions.length === 0) notFound();

  const pr = computePrs(logs).find((p) => p.exerciseId === exerciseId);
  const name = pr?.exerciseName ?? logs.find((l) => l.exerciseId === exerciseId)?.exerciseName ?? "Exercise";
  const muscle = pr?.muscleGroup;

  const trend = [...sessions].reverse();
  const maxW = Math.max(1, ...trend.map((s) => s.bestWeight));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/app/progress"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Progress
      </Link>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        {muscle || "Exercise"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {name}
      </h1>

      {pr && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Best weight
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {pr.bestWeight > 0 ? pr.bestWeight : "—"}
              {pr.bestWeight > 0 && (
                <span className="text-base font-normal text-zinc-500"> lbs</span>
              )}
            </p>
            {pr.bestWeightDate && (
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(pr.bestWeightDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {pr.bestWeightReps != null && ` · ${pr.bestWeightReps} reps`}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Best set volume
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {pr.bestSetVolumeLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatVolume(pr.bestSetVolume)} lbs·reps
              {pr.bestSetVolumeDate &&
                ` · ${new Date(pr.bestSetVolumeDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}`}
            </p>
          </div>
        </div>
      )}

      {/* Weight trend */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
          Top-set weight
        </h2>
        <div className="mt-4 flex h-36 items-end gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 pb-3 pt-6">
          {trend.map((s) => {
            const h = Math.max(8, Math.round((s.bestWeight / maxW) * 100));
            return (
              <div
                key={s.workoutId}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                title={`${s.bestWeight} lbs · ${new Date(s.completedAt).toLocaleDateString()}`}
              >
                <span className="text-[9px] text-zinc-500">
                  {s.bestWeight > 0 ? s.bestWeight : "·"}
                </span>
                <div
                  className="w-full max-w-[28px] rounded-sm bg-gold-500/80"
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Sessions */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
          Sessions
        </h2>
        <ul className="mt-4 space-y-3">
          {sessions.map((s) => (
            <li key={s.workoutId}>
              <Link
                href={`/app/workouts/${s.workoutId}`}
                className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-gold-400"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {new Date(s.completedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Top {s.bestWeight > 0 ? `${s.bestWeight} lbs` : "—"}
                    {" · "}
                    {formatVolume(s.totalVolume)} vol
                  </p>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {s.sets
                    .map((set) =>
                      set.weight != null || set.reps != null
                        ? `${set.weight ?? "—"}×${set.reps ?? "—"}`
                        : "—",
                    )
                    .join("  ·  ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

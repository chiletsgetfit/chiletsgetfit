import Link from "next/link";
import { loadClientSetLogs } from "@/lib/progress-data";
import {
  computePrs,
  formatVolume,
  startOfWeek,
  topMovers,
  weekStats,
} from "@/lib/progress";

export default async function ProgressPage() {
  const logs = await loadClientSetLogs();
  const thisWeekStart = startOfWeek();
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeek = weekStats(logs, thisWeekStart);
  const lastWeek = weekStats(logs, lastWeekStart);
  const prs = computePrs(logs);
  const movers = topMovers(logs).slice(0, 6);
  const volDelta = thisWeek.volume - lastWeek.volume;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link
          href="/app"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Today
        </Link>
        <div className="flex gap-4">
          <Link
            href="/app"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
          >
            Train →
          </Link>
          <Link
            href="/app/history"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
          >
            History →
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Strength
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Progress
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Built from every set you&apos;ve logged. Keep training — this gets
        sharper over time.
      </p>

      {logs.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-sm text-zinc-400">
          No completed sets yet. Finish a workout with weights and reps logged,
          then come back.
        </p>
      ) : (
        <>
          {/* This week */}
          <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              This week
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Stat label="Sessions" value={String(thisWeek.sessions)} />
              <Stat label="Sets" value={String(thisWeek.sets)} />
              <Stat
                label="Volume"
                value={`${formatVolume(thisWeek.volume)}`}
                hint="lbs·reps"
              />
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              {lastWeek.volume === 0 && thisWeek.volume === 0
                ? "Log sets this week to start the comparison."
                : volDelta > 0
                  ? `${formatVolume(volDelta)} more volume than last week.`
                  : volDelta < 0
                    ? `${formatVolume(Math.abs(volDelta))} less volume than last week.`
                    : "Volume matches last week."}
            </p>
          </section>

          {/* Movers */}
          {movers.length > 0 && (
            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
                Top movers
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Best top-set weight · last 4 weeks vs prior 4
              </p>
              <ul className="mt-4 space-y-2">
                {movers.map((m) => (
                  <li key={m.exerciseId}>
                    <Link
                      href={`/app/progress/${m.exerciseId}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition-colors hover:border-gold-400"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {m.exerciseName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {m.priorBest} → {m.recentBest} lbs
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          m.delta > 0 ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {m.delta > 0 ? "+" : ""}
                        {m.delta} lbs
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* PRs */}
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
              Personal records
            </h2>
            <ul className="mt-4 space-y-2">
              {prs.slice(0, 12).map((p) => (
                <li key={p.exerciseId}>
                  <Link
                    href={`/app/progress/${p.exerciseId}`}
                    className="block rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition-colors hover:border-gold-400"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-white">{p.exerciseName}</p>
                      <p className="text-sm text-gold-400">
                        {p.bestWeight > 0 ? `${p.bestWeight} lbs` : "—"}
                        {p.bestWeightReps != null && (
                          <span className="text-zinc-500">
                            {" "}
                            × {p.bestWeightReps}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Best set vol {p.bestSetVolumeLabel}
                      {" · "}
                      {p.sessions}{" "}
                      {p.sessions === 1 ? "session" : "sessions"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* All exercises */}
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
              All exercises
            </h2>
            <ul className="mt-4 divide-y divide-zinc-900 rounded-2xl border border-zinc-800 bg-zinc-950">
              {prs
                .slice()
                .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
                .map((p) => (
                  <li key={p.exerciseId}>
                    <Link
                      href={`/app/progress/${p.exerciseId}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-900/60"
                    >
                      <span className="text-zinc-200">{p.exerciseName}</span>
                      <span className="text-zinc-500">
                        {p.bestWeight > 0 ? `${p.bestWeight} lbs` : "View →"}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-white">
        {value}
        {hint && (
          <span className="ml-1 text-xs font-normal text-zinc-600">{hint}</span>
        )}
      </p>
    </div>
  );
}

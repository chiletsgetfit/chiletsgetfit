import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  DATE_RE,
  dateLabel,
  getTimeZone,
  loadEntries,
  loadRecents,
  loadTargets,
  shiftDate,
  sumEntries,
  todayIn,
  type DiaryEntry,
} from "@/lib/food/server";
import { MEALS, MEAL_LABELS, fmtGrams, fmtQty, type Meal } from "@/lib/food/types";
import { FoodLogger } from "./FoodLogger";
import { TimezoneSync } from "./TimezoneSync";
import { copyDay, deleteFoodEntry } from "./actions";

export default async function FoodLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const tz = await getTimeZone();
  const today = todayIn(tz);
  const date = dateParam && DATE_RE.test(dateParam) ? dateParam : today;
  const yesterday = shiftDate(date, -1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  let entries: DiaryEntry[] = [];
  let yesterdayEntries: DiaryEntry[] = [];
  let targets: Awaited<ReturnType<typeof loadTargets>> = null;
  let recents: Awaited<ReturnType<typeof loadRecents>> = [];
  try {
    [entries, yesterdayEntries, targets, recents] = await Promise.all([
      loadEntries(supabase, userId, date),
      loadEntries(supabase, userId, yesterday),
      loadTargets(supabase, userId),
      loadRecents(supabase, userId, today),
    ]);
  } catch (e) {
    return <FoodUnavailable message={e instanceof Error ? e.message : "Unknown error"} />;
  }

  const totals = sumEntries(entries);
  const byMeal = new Map<Meal, DiaryEntry[]>(MEALS.map((m) => [m, []]));
  for (const e of entries) byMeal.get(e.meal)!.push(e);
  const remaining = targets ? targets.kcal - totals.kcal : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <TimezoneSync serverToday={today} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link
          href="/app"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Today
        </Link>
        <Link
          href="/app/food/targets"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          {targets ? "Targets →" : "Set targets →"}
        </Link>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Nutrition
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Food log</h1>
        <nav className="flex items-center gap-1" aria-label="Change day">
          <Link
            href={`/app/food?date=${yesterday}`}
            aria-label="Previous day"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-300 hover:border-gold-400 hover:text-gold-400"
          >
            ‹
          </Link>
          <Link
            href={date === today ? "/app/food" : `/app/food?date=${date}`}
            className="min-w-[7.5rem] text-center text-sm font-medium text-white"
          >
            {dateLabel(date, today)}
          </Link>
          <Link
            href={`/app/food?date=${shiftDate(date, 1)}`}
            aria-label="Next day"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-300 hover:border-gold-400 hover:text-gold-400"
          >
            ›
          </Link>
        </nav>
      </div>

      {/* Daily totals */}
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-zinc-300">
            <span className="text-3xl font-semibold text-white">
              {totals.kcal.toLocaleString()}
            </span>
            {targets ? (
              <span className="text-zinc-500"> / {targets.kcal.toLocaleString()} kcal</span>
            ) : (
              <span className="text-zinc-500"> kcal</span>
            )}
          </p>
          {remaining !== null && (
            <p
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                remaining < 0 ? "text-amber-400" : "text-zinc-500"
              }`}
            >
              {remaining < 0
                ? `${Math.abs(remaining).toLocaleString()} over`
                : `${remaining.toLocaleString()} left`}
            </p>
          )}
        </div>
        {targets && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
            <div
              className={`h-full transition-all ${remaining !== null && remaining < 0 ? "bg-amber-400" : "bg-gold-500"}`}
              style={{ width: `${Math.min(100, (totals.kcal / Math.max(1, targets.kcal)) * 100)}%` }}
            />
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-4">
          <MacroStat label="Protein" value={totals.protein} target={targets?.protein ?? null} />
          <MacroStat label="Carbs" value={totals.carbs} target={targets?.carbs ?? null} />
          <MacroStat label="Fat" value={totals.fat} target={targets?.fat ?? null} />
        </div>

        {!targets && (
          <p className="mt-5 text-sm text-zinc-400">
            No targets yet.{" "}
            <Link href="/app/food/targets" className="text-gold-400 hover:text-gold-300">
              Set your calories and macros
            </Link>{" "}
            or run the{" "}
            <a
              href="/resources/tdee-calculator.html"
              className="text-gold-400 hover:text-gold-300"
            >
              TDEE calculator
            </a>{" "}
            and save its numbers with one tap.
          </p>
        )}
      </section>

      {/* Meals */}
      <div className="mt-8 space-y-4">
        {MEALS.map((meal) => {
          const list = byMeal.get(meal) ?? [];
          const mealKcal = Math.round(list.reduce((s, e) => s + e.kcal, 0));
          return (
            <section key={meal} className="rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
                  {MEAL_LABELS[meal]}
                </h2>
                <div className="flex items-center gap-4">
                  {list.length > 0 && (
                    <span className="text-sm text-zinc-400">
                      {mealKcal.toLocaleString()} <span className="text-zinc-600">kcal</span>
                    </span>
                  )}
                  <FoodLogger date={date} meal={meal} recents={recents} />
                </div>
              </div>
              {list.length > 0 && (
                <ul className="divide-y divide-zinc-900 border-t border-zinc-900">
                  {list.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{e.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {[
                            e.brand,
                            e.portionLabel
                              ? `${fmtQty(e.quantity)} × ${e.portionLabel}`
                              : e.foodId
                                ? null
                                : "Quick add",
                            e.grams !== null && e.portionLabel !== "g" ? `${fmtGrams(e.grams)} g` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-start gap-3">
                        <div className="text-right">
                          <p className="text-sm text-zinc-200">
                            {Math.round(e.kcal).toLocaleString()}
                            <span className="text-zinc-500"> kcal</span>
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            P {e.protein} · C {e.carbs} · F {e.fat}
                          </p>
                        </div>
                        <form action={deleteFoodEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="date" value={date} />
                          <button
                            type="submit"
                            aria-label={`Remove ${e.name}`}
                            className="-mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:text-red-400"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-center">
          <p className="text-sm text-zinc-400">
            Nothing logged {dateLabel(date, today).toLowerCase() === "today" ? "yet today" : "this day"}.
            Tap <span className="text-gold-400">+ Add food</span> on a meal to start.
          </p>
          {yesterdayEntries.length > 0 && (
            <form action={copyDay} className="mt-4">
              <input type="hidden" name="from" value={yesterday} />
              <input type="hidden" name="to" value={date} />
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-full border border-zinc-700 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400"
              >
                Copy {dateLabel(yesterday, today).toLowerCase()} ({yesterdayEntries.length} items)
              </button>
            </form>
          )}
        </div>
      )}

      {totals.fiber > 0 && (
        <p className="mt-6 text-xs text-zinc-600">Fiber today: {totals.fiber} g</p>
      )}
    </div>
  );
}

/** Shown when the food tables can't be read (migration not run yet, or the database is paused). */
function FoodUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/app"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Today
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Nutrition
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Food log</h1>
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-sm text-zinc-200">Food tracking isn&apos;t switched on yet.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Your coach has one setup step left on the database side. Check back soon.
        </p>
        <p className="mt-4 break-words text-xs text-zinc-600">For the coach: {message}</p>
      </div>
    </div>
  );
}

function MacroStat({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number | null;
}) {
  const pct = target ? Math.min(100, (value / Math.max(1, target)) * 100) : 0;
  const over = target !== null && value > target;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {Math.round(value)}
        <span className="text-sm font-normal text-zinc-500">
          {target !== null ? ` / ${target} g` : " g"}
        </span>
      </p>
      {target !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
          <div
            className={`h-full ${over ? "bg-amber-400" : "bg-gold-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

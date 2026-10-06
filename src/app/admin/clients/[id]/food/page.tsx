import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DATE_RE,
  dateLabel,
  getTimeZone,
  loadEntries,
  loadTargets,
  shiftDate,
  shortDate,
  sumEntries,
  todayIn,
  type DiaryEntry,
} from "@/lib/food/server";
import { MEALS, MEAL_LABELS, fmtGrams, fmtQty, type Meal } from "@/lib/food/types";
import { setClientTargets } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-gold-500";
const labelClass = "block text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500";

export default async function ClientFoodPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date: dateParam } = await searchParams;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  const today = todayIn(await getTimeZone());
  const date = dateParam && DATE_RE.test(dateParam) ? dateParam : today;
  const weekStart = shiftDate(date, -6);

  let week: DiaryEntry[] = [];
  let targets: Awaited<ReturnType<typeof loadTargets>> = null;
  try {
    [week, targets] = await Promise.all([
      loadEntries(supabase, id, weekStart, date),
      loadTargets(supabase, id),
    ]);
  } catch (e) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Link
          href="/admin/clients"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Clients
        </Link>
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-200">The food-tracking tables aren&apos;t available.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Run <code className="text-zinc-300">supabase/12-food-tracking.sql</code> in the Supabase
            SQL editor (fresh tab), then reload. If it was already run, the project may be paused.
          </p>
          <p className="mt-4 break-words text-xs text-zinc-600">
            {e instanceof Error ? e.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i)).map((d) => {
    const list = week.filter((e) => e.logDate === d);
    return { date: d, count: list.length, totals: sumEntries(list) };
  });
  const loggedDays = days.filter((d) => d.count > 0);
  const avg = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.totals.kcal, 0) / loggedDays.length)
    : null;

  const dayEntries = week.filter((e) => e.logDate === date);
  const dayTotals = sumEntries(dayEntries);
  const byMeal = new Map<Meal, DiaryEntry[]>(MEALS.map((m) => [m, []]));
  for (const e of dayEntries) byMeal.get(e.meal)!.push(e);

  const setTargets = setClientTargets.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/clients"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Clients
      </Link>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Food log
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {client.full_name ?? client.email ?? "Client"}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        {loggedDays.length === 0
          ? "No food logged in the last 7 days."
          : `Logged ${loggedDays.length} of the last 7 days${avg !== null ? ` · averaging ${avg.toLocaleString()} kcal on logged days` : ""}.`}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Week table */}
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-900 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                <th className="px-4 py-3 font-semibold">Day</th>
                <th className="px-2 py-3 text-right font-semibold">kcal</th>
                <th className="px-2 py-3 text-right font-semibold">P</th>
                <th className="px-2 py-3 text-right font-semibold">C</th>
                <th className="px-4 py-3 text-right font-semibold">F</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {days.map((d) => {
                const selected = d.date === date;
                const over = targets && d.totals.kcal > targets.kcal;
                return (
                  <tr key={d.date} className={selected ? "bg-gold-500/5" : undefined}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${id}/food?date=${d.date}`}
                        className={`hover:text-gold-400 ${selected ? "text-gold-400" : "text-zinc-200"}`}
                      >
                        {dateLabel(d.date, today) === "Today" ? "Today" : shortDate(d.date)}
                      </Link>
                      {d.count === 0 && <span className="ml-2 text-xs text-zinc-600">—</span>}
                    </td>
                    <td className={`px-2 py-3 text-right ${over ? "text-amber-400" : "text-zinc-200"}`}>
                      {d.count ? d.totals.kcal.toLocaleString() : ""}
                    </td>
                    <td className="px-2 py-3 text-right text-zinc-400">
                      {d.count ? Math.round(d.totals.protein) : ""}
                    </td>
                    <td className="px-2 py-3 text-right text-zinc-400">
                      {d.count ? Math.round(d.totals.carbs) : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {d.count ? Math.round(d.totals.fat) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {targets && (
              <tfoot>
                <tr className="border-t border-zinc-800 text-xs text-zinc-500">
                  <td className="px-4 py-3">Target</td>
                  <td className="px-2 py-3 text-right">{targets.kcal.toLocaleString()}</td>
                  <td className="px-2 py-3 text-right">{targets.protein}</td>
                  <td className="px-2 py-3 text-right">{targets.carbs}</td>
                  <td className="px-4 py-3 text-right">{targets.fat}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        {/* Targets */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Daily targets
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {targets
              ? `${targets.kcal.toLocaleString()} kcal · P ${targets.protein} / C ${targets.carbs} / F ${targets.fat}${targets.note ? ` · ${targets.note}` : ""}`
              : "No targets set. The client sees totals but nothing to aim for."}
          </p>
          <form action={setTargets} className="mt-4 space-y-3">
            <div>
              <label htmlFor="kcal" className={labelClass}>
                Calories
              </label>
              <input
                id="kcal"
                name="kcal"
                type="number"
                min={500}
                max={10000}
                required
                defaultValue={targets?.kcal ?? ""}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="protein_g" className={labelClass}>
                  Protein g
                </label>
                <input
                  id="protein_g"
                  name="protein_g"
                  type="number"
                  min={0}
                  max={1000}
                  required
                  defaultValue={targets?.protein ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="carbs_g" className={labelClass}>
                  Carbs g
                </label>
                <input
                  id="carbs_g"
                  name="carbs_g"
                  type="number"
                  min={0}
                  max={2000}
                  required
                  defaultValue={targets?.carbs ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="fat_g" className={labelClass}>
                  Fat g
                </label>
                <input
                  id="fat_g"
                  name="fat_g"
                  type="number"
                  min={0}
                  max={1000}
                  required
                  defaultValue={targets?.fat ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="note" className={labelClass}>
                Note
              </label>
              <input
                id="note"
                name="note"
                maxLength={120}
                defaultValue={targets?.note ?? ""}
                placeholder="Fat loss phase"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              Save targets
            </button>
          </form>
        </section>
      </div>

      {/* Selected day */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
            {dateLabel(date, today)}
          </h2>
          <p className="text-sm text-zinc-400">
            {dayTotals.kcal.toLocaleString()} kcal · P {Math.round(dayTotals.protein)} · C{" "}
            {Math.round(dayTotals.carbs)} · F {Math.round(dayTotals.fat)}
          </p>
        </div>
        {dayEntries.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
            Nothing logged this day.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MEALS.map((meal) => {
              const list = byMeal.get(meal) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={meal} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    {MEAL_LABELS[meal]}
                  </p>
                  <ul className="mt-2 divide-y divide-zinc-900">
                    {list.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{e.name}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {[
                              e.brand,
                              e.portionLabel ? `${fmtQty(e.quantity)} × ${e.portionLabel}` : null,
                              e.grams !== null && e.portionLabel !== "g" ? `${fmtGrams(e.grams)} g` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm text-zinc-200">{Math.round(e.kcal)}</p>
                          <p className="text-[11px] text-zinc-500">
                            {e.protein}/{e.carbs}/{e.fat}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

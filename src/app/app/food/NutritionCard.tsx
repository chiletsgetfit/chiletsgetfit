import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone, loadEntries, loadTargets, sumEntries, todayIn } from "@/lib/food/server";

/** Today's calories at a glance for the client home page. Degrades to a plain link if the food tables aren't there yet. */
export async function NutritionCard({ userId }: { userId: string }) {
  let kcal = 0;
  let items = 0;
  let target: number | null = null;
  let ready = true;
  try {
    const supabase = await createClient();
    const today = todayIn(await getTimeZone());
    const [entries, targets] = await Promise.all([
      loadEntries(supabase, userId, today),
      loadTargets(supabase, userId),
    ]);
    kcal = sumEntries(entries).kcal;
    items = entries.length;
    target = targets?.kcal ?? null;
  } catch {
    ready = false;
  }

  const remaining = target !== null ? target - kcal : null;

  return (
    <Link
      href="/app/food"
      className="group mt-4 block rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-gold-400 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-zinc-300">
          {ready ? (
            <>
              <span className="text-2xl font-semibold text-white">{kcal.toLocaleString()}</span>
              <span className="text-zinc-500">
                {target !== null ? ` / ${target.toLocaleString()} kcal today` : " kcal today"}
              </span>
            </>
          ) : (
            <span className="text-lg font-semibold text-white">Food log</span>
          )}
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Nutrition</p>
      </div>
      {ready && target !== null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
          <div
            className={`h-full ${remaining !== null && remaining < 0 ? "bg-amber-400" : "bg-gold-500"}`}
            style={{ width: `${Math.min(100, (kcal / Math.max(1, target)) * 100)}%` }}
          />
        </div>
      )}
      <p className="mt-3 text-sm text-zinc-400">
        {!ready
          ? "Track calories and macros against your targets."
          : items === 0
            ? "Nothing logged yet today."
            : remaining === null
              ? `${items} item${items === 1 ? "" : "s"} logged. Set targets to see what's left.`
              : remaining < 0
                ? `${Math.abs(remaining).toLocaleString()} kcal over target.`
                : `${remaining.toLocaleString()} kcal left today.`}{" "}
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400 group-hover:text-gold-300">
          Log food →
        </span>
      </p>
    </Link>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadTargets } from "@/lib/food/server";
import { saveTargets } from "../actions";

const inputClass =
  "mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white outline-none focus:border-gold-500";
const labelClass = "block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400";

export default async function TargetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let targets: Awaited<ReturnType<typeof loadTargets>> = null;
  try {
    targets = await loadTargets(supabase, user!.id);
  } catch (e) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/app/food"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          ← Food log
        </Link>
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-200">Food tracking isn&apos;t switched on yet.</p>
          <p className="mt-4 break-words text-xs text-zinc-600">
            For the coach: {e instanceof Error ? e.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }
  const macroKcal = targets ? targets.protein * 4 + targets.carbs * 4 + targets.fat * 9 : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/app/food"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Food log
      </Link>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Nutrition
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Daily targets</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Your calorie and macro goals for each day. Not sure what they should be? Run the{" "}
        <a href="/resources/tdee-calculator.html" className="text-gold-400 hover:text-gold-300">
          TDEE calculator
        </a>{" "}
        while signed in and tap <span className="text-zinc-200">Save as my targets</span> under
        the goal you want. Your coach can also set these for you.
      </p>

      <form
        action={saveTargets}
        className="mt-8 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8"
      >
        <div>
          <label htmlFor="kcal" className={labelClass}>
            Calories per day
          </label>
          <input
            id="kcal"
            name="kcal"
            type="number"
            inputMode="numeric"
            min={500}
            max={10000}
            required
            defaultValue={targets?.kcal ?? ""}
            className={inputClass}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="protein_g" className={labelClass}>
              Protein (g)
            </label>
            <input
              id="protein_g"
              name="protein_g"
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              required
              defaultValue={targets?.protein ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="carbs_g" className={labelClass}>
              Carbs (g)
            </label>
            <input
              id="carbs_g"
              name="carbs_g"
              type="number"
              inputMode="numeric"
              min={0}
              max={2000}
              required
              defaultValue={targets?.carbs ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fat_g" className={labelClass}>
              Fat (g)
            </label>
            <input
              id="fat_g"
              name="fat_g"
              type="number"
              inputMode="numeric"
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
            Note (optional)
          </label>
          <input
            id="note"
            name="note"
            maxLength={120}
            defaultValue={targets?.note ?? ""}
            placeholder="Fat loss phase · from calculator"
            className={inputClass}
          />
        </div>

        {targets && macroKcal !== null && (
          <p className="text-xs text-zinc-500">
            Your macros add up to {macroKcal.toLocaleString()} kcal
            {Math.abs(macroKcal - targets.kcal) > 50
              ? ` — ${Math.abs(macroKcal - targets.kcal)} ${macroKcal > targets.kcal ? "more" : "less"} than your calorie target. That's fine as a rough guide; carbs usually absorb the difference.`
              : ", right in line with your calorie target."}
            {targets.updatedAt && (
              <>
                {" "}
                Last saved{" "}
                {new Date(targets.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                .
              </>
            )}
          </p>
        )}

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gold-500 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 sm:w-auto"
        >
          Save targets
        </button>
      </form>
    </div>
  );
}

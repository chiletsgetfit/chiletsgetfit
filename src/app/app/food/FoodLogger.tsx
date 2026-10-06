"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MEAL_LABELS,
  UNIT_PORTIONS,
  fmtGrams,
  fmtQty,
  macrosForGrams,
  type FoodSummary,
  type Meal,
  type Portion,
} from "@/lib/food/types";
import type { RecentFood } from "@/lib/food/server";
import { addFoodEntry, addQuickEntry, createCustomFood } from "./actions";

type Tab = "search" | "quick" | "custom";

const inputClass =
  "block w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500";
const labelClass = "block text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500";
const primaryBtn =
  "inline-flex h-11 w-full items-center justify-center rounded-full bg-gold-500 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 disabled:opacity-50";

function portionOptions(food: FoodSummary): Portion[] {
  const own = food.portions ?? [];
  const nominalOnly = own.length > 0 && own.every((p) => p.nominal);
  return nominalOnly ? own : [...own, ...UNIT_PORTIONS];
}

function sourceTag(f: FoodSummary) {
  if (f.source === "custom") return "Your food";
  if (f.generic) return "USDA";
  return f.brand ?? "Brand";
}

export function FoodLogger({
  date,
  meal,
  recents,
}: {
  date: string;
  meal: Meal;
  recents: RecentFood[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("search");

  // search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [usdaError, setUsdaError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // selection
  const [selected, setSelected] = useState<FoodSummary | null>(null);
  const [portion, setPortion] = useState<Portion | null>(null);
  const [qty, setQty] = useState("1");

  // quick add
  const [quick, setQuick] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  // custom food
  const [custom, setCustom] = useState({
    name: "",
    brand: "",
    servingLabel: "1 serving",
    servingGrams: "",
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSelected(null);
    setPortion(null);
    setError(null);
    setQuery("");
    setResults([]);
    setUsdaError(null);
    setTab("search");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open && tab === "search" && !selected) inputRef.current?.focus();
  }, [open, tab, selected]);

  // Debounced search against /api/food/search (local catalog + USDA).
  useEffect(() => {
    if (!open || tab !== "search") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setUsdaError(null);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as {
          results?: FoodSummary[];
          usdaError?: string | null;
          error?: string;
        };
        if (ctrl.signal.aborted) return;
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.results ?? []);
        setUsdaError(data.usdaError ?? null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setResults([]);
        setUsdaError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, tab]);

  function startWith(food: FoodSummary, preset?: { portion?: Portion; qty?: number }) {
    const opts = portionOptions(food);
    const p = preset?.portion ?? opts[0] ?? UNIT_PORTIONS[0];
    setSelected(food);
    setPortion(p);
    setQty(fmtQty(preset?.qty ?? (p.label === "g" ? 100 : 1)));
    setError(null);
  }

  async function resolve(params: string): Promise<FoodSummary> {
    const res = await fetch(`/api/food/resolve?${params}`);
    const data = (await res.json()) as { food?: FoodSummary; error?: string };
    if (!res.ok || !data.food) throw new Error(data.error ?? "Could not load that food");
    return data.food;
  }

  async function pick(food: FoodSummary) {
    setError(null);
    if (food.id) {
      startWith(food);
      return;
    }
    const key = `${food.source}:${food.sourceId}`;
    setResolving(key);
    try {
      startWith(
        await resolve(
          `source=${encodeURIComponent(food.source)}&sourceId=${encodeURIComponent(food.sourceId)}`
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that food");
    } finally {
      setResolving(null);
    }
  }

  async function pickRecent(r: RecentFood) {
    setError(null);
    setResolving(r.foodId);
    try {
      const food = await resolve(`id=${encodeURIComponent(r.foodId)}`);
      const match =
        portionOptions(food).find((p) => p.label === r.portionLabel) ??
        (r.portionLabel && r.portionGrams
          ? { label: r.portionLabel, grams: r.portionGrams }
          : undefined);
      startWith(food, { portion: match, qty: r.quantity });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that food");
    } finally {
      setResolving(null);
    }
  }

  async function addAgain(r: RecentFood) {
    setBusy(true);
    setError(null);
    const res = await addFoodEntry({
      date,
      meal,
      foodId: r.foodId,
      portionLabel: r.portionLabel ?? "g",
      portionGrams: r.portionGrams ?? 100,
      quantity: r.quantity,
      nominal: r.portionGrams === null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    close();
    router.refresh();
  }

  async function submitAdd() {
    if (!selected?.id || !portion) return;
    const q = Number(qty);
    if (!(q > 0)) {
      setError("Enter a quantity.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await addFoodEntry({
      date,
      meal,
      foodId: selected.id,
      portionLabel: portion.label,
      portionGrams: portion.grams,
      quantity: q,
      nominal: !!portion.nominal,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    close();
    router.refresh();
  }

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addQuickEntry({
      date,
      meal,
      name: quick.name,
      kcal: Number(quick.kcal),
      protein: Number(quick.protein) || 0,
      carbs: Number(quick.carbs) || 0,
      fat: Number(quick.fat) || 0,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setQuick({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
    close();
    router.refresh();
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createCustomFood({
      name: custom.name,
      brand: custom.brand,
      servingLabel: custom.servingLabel,
      servingGrams: custom.servingGrams ? Number(custom.servingGrams) : null,
      kcal: Number(custom.kcal),
      protein: Number(custom.protein) || 0,
      carbs: Number(custom.carbs) || 0,
      fat: Number(custom.fat) || 0,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCustom({
      name: "",
      brand: "",
      servingLabel: "1 serving",
      servingGrams: "",
      kcal: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    setTab("search");
    startWith(res.data);
  }

  const grams = selected && portion ? (Number(qty) || 0) * portion.grams : 0;
  const preview = selected ? macrosForGrams(selected, grams) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400 hover:text-gold-300"
      >
        + Add food
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Add food to ${MEAL_LABELS[meal]}`}
            className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 sm:max-w-lg sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  {MEAL_LABELS[meal]}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-white">
                  {selected ? "How much?" : "Add food"}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-400 hover:text-gold-400"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selected && portion ? (
                <div className="space-y-5 p-5">
                  <div>
                    <p className="text-base font-medium text-white">{selected.name}</p>
                    <p className="text-xs text-zinc-500">{sourceTag(selected)}</p>
                  </div>

                  <div className="grid grid-cols-[1fr_2fr] gap-3">
                    <div>
                      <label htmlFor={`qty-${meal}`} className={labelClass}>
                        Quantity
                      </label>
                      <input
                        id={`qty-${meal}`}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className={`mt-2 ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`portion-${meal}`} className={labelClass}>
                        Portion
                      </label>
                      <select
                        id={`portion-${meal}`}
                        value={portion.label}
                        onChange={(e) => {
                          const next = portionOptions(selected).find((p) => p.label === e.target.value);
                          if (!next) return;
                          setPortion(next);
                          if (next.label === "g" && Number(qty) <= 10) setQty("100");
                          if (portion.label === "g" && next.label !== "g") setQty("1");
                        }}
                        className={`mt-2 ${inputClass}`}
                      >
                        {portionOptions(selected).map((p) => (
                          <option key={p.label} value={p.label}>
                            {p.label}
                            {p.nominal || p.label === "g" || p.label === "oz"
                              ? ""
                              : ` · ${fmtGrams(p.grams)} g`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {preview && (
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <p className="text-2xl font-semibold text-white">
                        {preview.kcal.toLocaleString()}{" "}
                        <span className="text-sm font-normal text-zinc-500">kcal</span>
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        P {preview.protein} g · C {preview.carbs} g · F {preview.fat} g
                        {!portion.nominal && grams > 0 && (
                          <span className="text-zinc-600"> · {fmtGrams(grams)} g</span>
                        )}
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={submitAdd} disabled={busy} className={primaryBtn}>
                      {busy ? "Adding…" : `Add to ${MEAL_LABELS[meal]}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setPortion(null);
                        setError(null);
                      }}
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
                    >
                      ← Back to search
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex gap-1 border-b border-zinc-900 px-3 pt-3">
                    {(
                      [
                        ["search", "Search"],
                        ["quick", "Quick add"],
                        ["custom", "Custom food"],
                      ] as [Tab, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setTab(key);
                          setError(null);
                        }}
                        className={`rounded-t-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                          tab === key
                            ? "border-b-2 border-gold-500 text-gold-400"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {tab === "search" && (
                    <div>
                      <div className="p-4">
                        <input
                          ref={inputRef}
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search foods… e.g. chicken breast, oats, Chobani"
                          autoComplete="off"
                          className={inputClass}
                        />
                      </div>

                      {error && <p className="px-4 pb-2 text-sm text-red-400">{error}</p>}

                      {query.trim().length < 2 ? (
                        recents.length > 0 ? (
                          <div className="pb-4">
                            <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                              Recent
                            </p>
                            <ul className="divide-y divide-zinc-900">
                              {recents.map((r) => (
                                <li key={r.foodId} className="flex items-center gap-2 pr-3">
                                  <button
                                    type="button"
                                    onClick={() => pickRecent(r)}
                                    disabled={busy}
                                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-900"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm text-white">{r.name}</span>
                                      <span className="block truncate text-xs text-zinc-500">
                                        {[r.brand, r.portionLabel ? `${fmtQty(r.quantity)} × ${r.portionLabel}` : null]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    </span>
                                    {resolving === r.foodId && (
                                      <span className="text-xs text-zinc-500">…</span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addAgain(r)}
                                    disabled={busy}
                                    aria-label={`Add ${r.name} again`}
                                    className="inline-flex h-9 shrink-0 items-center rounded-full border border-zinc-700 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:border-gold-400 hover:text-gold-400 disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="px-4 pb-6 text-sm text-zinc-500">
                            Type at least two letters. Whole foods come first, then brands.
                          </p>
                        )
                      ) : (
                        <div className="pb-4">
                          {searching && results.length === 0 && (
                            <p className="px-4 pb-4 text-sm text-zinc-500">Searching…</p>
                          )}
                          {!searching && results.length === 0 && (
                            <p className="px-4 pb-4 text-sm text-zinc-500">
                              Nothing matched. Try fewer words, or add it as a custom food.
                            </p>
                          )}
                          <ul className="divide-y divide-zinc-900">
                            {results.map((f) => {
                              const key = `${f.source}:${f.sourceId}`;
                              const serving = f.portions[0];
                              const per = serving && !f.generic ? macrosForGrams(f, serving.grams) : null;
                              return (
                                <li key={f.id ?? key}>
                                  <button
                                    type="button"
                                    onClick={() => pick(f)}
                                    disabled={resolving !== null}
                                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-900 disabled:opacity-60"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm text-white">{f.name}</span>
                                      <span className="block truncate text-xs text-zinc-500">
                                        {sourceTag(f)}
                                        {f.source === "usda" && !f.generic && f.category
                                          ? ` · ${f.category}`
                                          : ""}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                      <span className="block text-sm text-zinc-200">
                                        {resolving === key
                                          ? "…"
                                          : (per ? per.kcal : Math.round(f.kcal100)).toLocaleString()}
                                        <span className="text-zinc-500"> kcal</span>
                                      </span>
                                      <span className="block text-[11px] text-zinc-500">
                                        {per ? "per serving" : "per 100 g"}
                                      </span>
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {usdaError && (
                            <p className="px-4 pt-3 text-xs text-amber-400">{usdaError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "quick" && (
                    <form onSubmit={submitQuick} className="space-y-4 p-5">
                      <p className="text-sm text-zinc-400">
                        Know the numbers already? Log calories and macros without picking a food.
                      </p>
                      <div>
                        <label htmlFor={`quick-name-${meal}`} className={labelClass}>
                          Name (optional)
                        </label>
                        <input
                          id={`quick-name-${meal}`}
                          value={quick.name}
                          onChange={(e) => setQuick({ ...quick, name: e.target.value })}
                          placeholder="Restaurant burrito"
                          className={`mt-2 ${inputClass}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {(
                          [
                            ["kcal", "Calories", true],
                            ["protein", "Protein g", false],
                            ["carbs", "Carbs g", false],
                            ["fat", "Fat g", false],
                          ] as const
                        ).map(([key, label, required]) => (
                          <div key={key}>
                            <label htmlFor={`quick-${key}-${meal}`} className={labelClass}>
                              {label}
                            </label>
                            <input
                              id={`quick-${key}-${meal}`}
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min="0"
                              required={required}
                              value={quick[key]}
                              onChange={(e) => setQuick({ ...quick, [key]: e.target.value })}
                              className={`mt-2 ${inputClass}`}
                            />
                          </div>
                        ))}
                      </div>
                      {error && <p className="text-sm text-red-400">{error}</p>}
                      <button type="submit" disabled={busy} className={primaryBtn}>
                        {busy ? "Adding…" : `Add to ${MEAL_LABELS[meal]}`}
                      </button>
                    </form>
                  )}

                  {tab === "custom" && (
                    <form onSubmit={submitCustom} className="space-y-4 p-5">
                      <p className="text-sm text-zinc-400">
                        Save a food that isn&apos;t in the database — your protein powder, a
                        family recipe, a meal-prep container. Enter the numbers for one
                        serving.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`custom-name-${meal}`} className={labelClass}>
                            Name
                          </label>
                          <input
                            id={`custom-name-${meal}`}
                            required
                            value={custom.name}
                            onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                            placeholder="Grandma's chili"
                            className={`mt-2 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label htmlFor={`custom-brand-${meal}`} className={labelClass}>
                            Brand (optional)
                          </label>
                          <input
                            id={`custom-brand-${meal}`}
                            value={custom.brand}
                            onChange={(e) => setCustom({ ...custom, brand: e.target.value })}
                            className={`mt-2 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label htmlFor={`custom-serving-${meal}`} className={labelClass}>
                            Serving
                          </label>
                          <input
                            id={`custom-serving-${meal}`}
                            required
                            value={custom.servingLabel}
                            onChange={(e) => setCustom({ ...custom, servingLabel: e.target.value })}
                            placeholder="1 scoop"
                            className={`mt-2 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label htmlFor={`custom-grams-${meal}`} className={labelClass}>
                            Serving weight g (optional)
                          </label>
                          <input
                            id={`custom-grams-${meal}`}
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            value={custom.servingGrams}
                            onChange={(e) => setCustom({ ...custom, servingGrams: e.target.value })}
                            className={`mt-2 ${inputClass}`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {(
                          [
                            ["kcal", "Calories", true],
                            ["protein", "Protein g", false],
                            ["carbs", "Carbs g", false],
                            ["fat", "Fat g", false],
                          ] as const
                        ).map(([key, label, required]) => (
                          <div key={key}>
                            <label htmlFor={`custom-${key}-${meal}`} className={labelClass}>
                              {label}
                            </label>
                            <input
                              id={`custom-${key}-${meal}`}
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min="0"
                              required={required}
                              value={custom[key]}
                              onChange={(e) => setCustom({ ...custom, [key]: e.target.value })}
                              className={`mt-2 ${inputClass}`}
                            />
                          </div>
                        ))}
                      </div>
                      {error && <p className="text-sm text-red-400">{error}</p>}
                      <button type="submit" disabled={busy} className={primaryBtn}>
                        {busy ? "Saving…" : "Save food & continue"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

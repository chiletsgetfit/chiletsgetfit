// Server-side food-tracking helpers: dates in the viewer's time zone, diary
// queries, local + USDA search, and caching a picked USDA food into `foods`.
// Server-only (imports next/headers and the service-role client).

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsdaFood, searchUsda, UsdaError } from "./usda";
import {
  FOOD_ROW_COLUMNS,
  detailToRow,
  isMeal,
  round1,
  rowToSummary,
  type FoodRow,
  type FoodSummary,
  type Meal,
} from "./types";

export const DEFAULT_TZ = "America/Los_Angeles";
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---- dates ------------------------------------------------------------------

function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The viewer's IANA zone from the cookie TimezoneSync sets; falls back to the coach's zone. */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const raw = store.get("tz")?.value;
  if (!raw) return DEFAULT_TZ;
  let tz = raw;
  try {
    tz = decodeURIComponent(raw); // the browser stores it percent-encoded ("America%2FLos_Angeles")
  } catch {
    // keep raw
  }
  return isValidTimeZone(tz) ? tz : DEFAULT_TZ;
}

/** YYYY-MM-DD for "now" in a zone (en-CA formats ISO-style). */
export function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function utcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function dateLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  if (date === shiftDate(today, 1)) return "Tomorrow";
  return utcDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function shortDate(date: string): string {
  return utcDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ---- diary entries ------------------------------------------------------------

export type DiaryEntry = {
  id: string;
  logDate: string;
  meal: Meal;
  foodId: string | null;
  name: string;
  brand: string | null;
  quantity: number;
  portionLabel: string | null;
  grams: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  notes: string | null;
  createdAt: string;
};

type RawEntry = {
  id: string;
  log_date: string;
  meal: string;
  food_id: string | null;
  name: string;
  brand: string | null;
  quantity: number | string;
  portion_label: string | null;
  grams: number | string | null;
  kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string | null;
  notes: string | null;
  created_at: string;
};

export const ENTRY_COLUMNS =
  "id, log_date, meal, food_id, name, brand, quantity, portion_label, grams, kcal, protein_g, carbs_g, fat_g, fiber_g, notes, created_at";

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v);
const numOrNull = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);

export function toEntry(r: RawEntry): DiaryEntry {
  return {
    id: r.id,
    logDate: r.log_date,
    meal: isMeal(r.meal) ? r.meal : "snacks",
    foodId: r.food_id,
    name: r.name,
    brand: r.brand,
    quantity: num(r.quantity),
    portionLabel: r.portion_label,
    grams: numOrNull(r.grams),
    kcal: num(r.kcal),
    protein: num(r.protein_g),
    carbs: num(r.carbs_g),
    fat: num(r.fat_g),
    fiber: numOrNull(r.fiber_g),
    notes: r.notes,
    createdAt: r.created_at,
  };
}

/** Entries for one user between two dates (inclusive), oldest first. */
export async function loadEntries(
  db: SupabaseClient,
  userId: string,
  from: string,
  to: string = from
): Promise<DiaryEntry[]> {
  const { data, error } = await db
    .from("food_log_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", userId)
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date")
    .order("created_at");
  if (error) throw new Error(error.message);
  return ((data ?? []) as RawEntry[]).map(toEntry);
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export function sumEntries(entries: DiaryEntry[]): Totals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const e of entries) {
    t.kcal += e.kcal;
    t.protein += e.protein;
    t.carbs += e.carbs;
    t.fat += e.fat;
    t.fiber += e.fiber ?? 0;
  }
  return {
    kcal: Math.round(t.kcal),
    protein: round1(t.protein),
    carbs: round1(t.carbs),
    fat: round1(t.fat),
    fiber: round1(t.fiber),
  };
}

// ---- targets ------------------------------------------------------------------

export type Targets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string | null;
  updatedAt: string;
};

export async function loadTargets(db: SupabaseClient, userId: string): Promise<Targets | null> {
  const { data, error } = await db
    .from("nutrition_targets")
    .select("kcal, protein_g, carbs_g, fat_g, note, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    kcal: num(data.kcal),
    protein: num(data.protein_g),
    carbs: num(data.carbs_g),
    fat: num(data.fat_g),
    note: data.note ?? null,
    updatedAt: data.updated_at,
  };
}

// ---- recents ------------------------------------------------------------------

export type RecentFood = {
  foodId: string;
  name: string;
  brand: string | null;
  portionLabel: string | null;
  /** Grams of ONE portion as last logged (null for weightless custom servings). */
  portionGrams: number | null;
  quantity: number;
  count: number;
};

/** Foods this user logged in the last ~6 weeks, most-used first, most recent breaking ties. */
export async function loadRecents(
  db: SupabaseClient,
  userId: string,
  today: string,
  limit = 12
): Promise<RecentFood[]> {
  const { data, error } = await db
    .from("food_log_entries")
    .select("food_id, name, brand, quantity, portion_label, grams, log_date, created_at")
    .eq("user_id", userId)
    .not("food_id", "is", null)
    .gte("log_date", shiftDate(today, -45))
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw new Error(error.message);

  const byFood = new Map<string, RecentFood>();
  for (const r of data ?? []) {
    if (!r.food_id) continue;
    const existing = byFood.get(r.food_id);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const qty = num(r.quantity) || 1;
    const grams = numOrNull(r.grams);
    byFood.set(r.food_id, {
      foodId: r.food_id,
      name: r.name,
      brand: r.brand,
      portionLabel: r.portion_label,
      portionGrams: grams !== null ? round1(grams / qty) : null,
      quantity: qty,
      count: 1,
    });
  }
  // Map keeps insertion (recency) order; a stable sort by count leaves recency as the tiebreak.
  return [...byFood.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

// ---- search + resolve ------------------------------------------------------------

export type SearchResult = { results: FoodSummary[]; usdaError: string | null };

/** Local catalog first (own custom foods, then anything cached), then USDA generic, then USDA branded. */
export async function searchFoods(
  db: SupabaseClient,
  userId: string,
  query: string
): Promise<SearchResult> {
  const q = query.trim();
  if (q.length < 2) return { results: [], usdaError: null };

  // PostgREST filter syntax treats these as structure, so keep them out of the pattern.
  const safe = q.replace(/[,().:*%\\"']/g, " ").replace(/\s+/g, " ").trim();

  const localPromise = safe
    ? db
        .from("foods")
        .select(FOOD_ROW_COLUMNS)
        .or(`name.ilike.%${safe}%,brand.ilike.%${safe}%`)
        .limit(15)
        .then(({ data }) => (data ?? []) as FoodRow[])
    : Promise.resolve([] as FoodRow[]);

  const usdaPromise = searchUsda(q, 8)
    .then((r) => ({ hits: r, error: null as string | null }))
    .catch((e: unknown) => {
      console.error("[food] USDA search failed:", e);
      return {
        hits: [] as FoodSummary[],
        error: e instanceof UsdaError ? e.message : "USDA search is unavailable right now.",
      };
    });

  const [localRows, usda] = await Promise.all([localPromise, usdaPromise]);

  localRows.sort((a, b) => {
    const own = Number(b.owner_id === userId) - Number(a.owner_id === userId);
    if (own) return own;
    const generic =
      Number(b.data_type !== "Branded" || b.source === "custom") -
      Number(a.data_type !== "Branded" || a.source === "custom");
    if (generic) return generic;
    return a.name.localeCompare(b.name);
  });
  const local = localRows.map(rowToSummary);
  const seen = new Set(local.map((f) => `${f.source}:${f.sourceId}`));
  const remote = usda.hits.filter((f) => !seen.has(`${f.source}:${f.sourceId}`));

  return { results: [...local, ...remote], usdaError: usda.error };
}

/**
 * Turn a search hit into a row in `foods` (with full portions) and return it.
 * Cached USDA rows are shared, so they are written with the service role.
 */
export async function resolveFood(
  db: SupabaseClient,
  opts: { id?: string | null; source?: string | null; sourceId?: string | null }
): Promise<FoodSummary | null> {
  if (opts.id) {
    const { data } = await db.from("foods").select(FOOD_ROW_COLUMNS).eq("id", opts.id).maybeSingle();
    return data ? rowToSummary(data as FoodRow) : null;
  }
  if (!opts.source || !opts.sourceId) return null;

  const { data: existing } = await db
    .from("foods")
    .select(FOOD_ROW_COLUMNS)
    .eq("source", opts.source)
    .eq("source_id", opts.sourceId)
    .maybeSingle();
  if (existing) return rowToSummary(existing as FoodRow);

  if (opts.source !== "usda") return null;
  const detail = await getUsdaFood(opts.sourceId);

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("foods")
    .upsert(detailToRow(detail, null), { onConflict: "source,source_id" })
    .select(FOOD_ROW_COLUMNS)
    .single();
  if (error || !row) throw new Error(error?.message ?? "Could not save the food.");
  return rowToSummary(row as FoodRow);
}

// USDA FoodData Central client. Server-only: it holds the API key.
// Docs: https://fdc.nal.usda.gov/api-guide
//
// Two kinds of data come back:
//   * generic whole foods (Foundation, SR Legacy, Survey/FNDDS) with deep nutrient
//     profiles and household portions ("1 cup, chopped")
//   * branded products with label nutrients and a serving size + barcode
// Everything is normalized to per-100 g values plus a list of named portions.

import type { FoodDetail, FoodSummary, NutrientAmount, Portion } from "./types";

const BASE = "https://api.nal.usda.gov/fdc/v1";
export const GENERIC_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)"];

const N = {
  kcal: 1008,
  kcalAtwaterSpecific: 2048,
  kcalAtwaterGeneral: 2047,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugar: 2000,
  satFat: 1258,
  sodium: 1093,
} as const;

export class UsdaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UsdaError";
    this.status = status;
  }
}

let warnedAboutKey = false;
function apiKey(): string {
  const key = process.env.USDA_API_KEY?.trim();
  if (key) return key;
  if (!warnedAboutKey) {
    warnedAboutKey = true;
    console.warn(
      "[food] USDA_API_KEY is not set; using DEMO_KEY (about 10 requests/hour, shared). Free key: https://fdc.nal.usda.gov/api-key-signup.html"
    );
  }
  return "DEMO_KEY";
}

// Small per-instance memo so repeated searches don't burn API quota.
const memo = new Map<string, { expires: number; value: unknown }>();
const MEMO_MAX = 500;
async function memoized<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  if (memo.size >= MEMO_MAX) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  memo.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

async function usdaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(apiKey())}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new UsdaError(
      timedOut ? "USDA is slow right now — try the search again." : "Couldn't reach USDA.",
      timedOut ? 504 : 502
    );
  }
  if (!res.ok) {
    const msg =
      res.status === 429
        ? "USDA search limit reached — try again in a few minutes."
        : res.status === 404
          ? "Food not found in USDA."
          : `USDA request failed (${res.status}).`;
    throw new UsdaError(msg, res.status);
  }
  return (await res.json()) as T;
}

// ---- raw shapes (only the fields we read) -----------------------------------

type RawSearchNutrient = { nutrientId: number; nutrientName?: string; value: number; unitName?: string };
type RawSearchFood = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodCategory?: string;
  foodNutrients?: RawSearchNutrient[];
};
type RawSearchResponse = { totalHits?: number; foods?: RawSearchFood[] };

type RawPortion = {
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string; abbreviation?: string };
};
type RawDetailNutrient = { amount?: number; nutrient?: { id: number; name: string; unitName: string } };
type RawDetail = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  brandedFoodCategory?: string;
  foodCategory?: { description?: string };
  wweiaFoodCategory?: { wweiaFoodCategoryDescription?: string };
  foodNutrients?: RawDetailNutrient[];
  foodPortions?: RawPortion[];
};

// ---- normalization -----------------------------------------------------------

/** Branded descriptions arrive in all caps; turn "CHICKEN BREAST, BONELESS" into "Chicken Breast, Boneless". */
function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-/(&"'])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .trim();
}

function trimNum(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

const GRAM_UNITS = new Set(["g", "gm", "grm", "gram", "grams"]);
const ML_UNITS = new Set(["ml", "mlt", "milliliter", "millilitre", "milliliters"]);

/** Branded foods: one serving from the label. ml is treated as g (close enough for drinks). */
function brandedPortion(size?: number, unit?: string, household?: string): Portion | null {
  if (!size || size <= 0 || !unit) return null;
  const u = unit.trim().toLowerCase();
  const isMl = ML_UNITS.has(u);
  if (!GRAM_UNITS.has(u) && !isMl) return null;
  const hh = household?.trim();
  const base = hh && !/^\d+(\.\d+)?\s*(g|gm|grm|ml|mlt)$/i.test(hh) ? titleCase(hh) : "1 serving";
  return { label: `${base} (${trimNum(size)} ${isMl ? "ml" : "g"})`, grams: size };
}

function portionLabel(p: RawPortion): string | null {
  const desc = p.portionDescription?.trim();
  if (desc && !/quantity not specified/i.test(desc)) return desc;
  const unit =
    p.measureUnit?.name && p.measureUnit.name.toLowerCase() !== "undetermined"
      ? p.measureUnit.name.trim()
      : "";
  // FNDDS stores a numeric portion code in `modifier` (e.g. "90000"); that is not a label.
  const rawModifier = p.modifier?.trim() ?? "";
  const modifier = /^\d+$/.test(rawModifier) ? "" : rawModifier;
  if (!unit && !modifier) return null;
  const amount = p.amount && p.amount > 0 ? trimNum(p.amount) : "1";
  return [amount, unit, modifier].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function genericPortions(list: RawPortion[] | undefined): Portion[] {
  const out: Portion[] = [];
  const seen = new Set<string>();
  for (const p of list ?? []) {
    const grams = p.gramWeight ?? 0;
    const label = portionLabel(p);
    if (!label || grams <= 0) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, grams: Math.round(grams * 10) / 10 });
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Energy per 100 g. Some Foundation foods only carry Atwater-factor energy ids, and the
 * abridged search payload can omit energy entirely, so fall back to 4/4/9 from the macros.
 */
function pickKcal(get: (id: number) => number | null) {
  const direct = get(N.kcal) ?? get(N.kcalAtwaterSpecific) ?? get(N.kcalAtwaterGeneral);
  if (direct !== null && direct > 0) return direct;
  const p = get(N.protein) ?? 0;
  const c = get(N.carbs) ?? 0;
  const f = get(N.fat) ?? 0;
  return p || c || f ? Math.round(4 * p + 4 * c + 9 * f) : 0;
}

function fromSearch(f: RawSearchFood): FoodSummary {
  const byId = new Map<number, number>();
  for (const n of f.foodNutrients ?? []) {
    if (typeof n.value === "number") byId.set(n.nutrientId, n.value);
  }
  const get = (id: number) => (byId.has(id) ? (byId.get(id) as number) : null);
  const branded = f.dataType === "Branded";
  const portion = branded
    ? brandedPortion(f.servingSize, f.servingSizeUnit, f.householdServingFullText)
    : null;
  return {
    id: null,
    source: "usda",
    sourceId: String(f.fdcId),
    name: branded ? titleCase(f.description) : f.description,
    brand: branded ? f.brandOwner || f.brandName || null : null,
    dataType: f.dataType,
    category: f.foodCategory ?? null,
    kcal100: pickKcal(get),
    protein100: get(N.protein) ?? 0,
    carbs100: get(N.carbs) ?? 0,
    fat100: get(N.fat) ?? 0,
    fiber100: get(N.fiber),
    sugar100: get(N.sugar),
    satFat100: get(N.satFat),
    sodium100: get(N.sodium),
    portions: portion ? [portion] : [],
    generic: !branded,
  };
}

function fromDetail(d: RawDetail): FoodDetail {
  const nutrients: NutrientAmount[] = [];
  const byId = new Map<number, number>();
  for (const n of d.foodNutrients ?? []) {
    if (!n.nutrient || typeof n.amount !== "number") continue;
    byId.set(n.nutrient.id, n.amount);
    if (n.amount > 0) {
      nutrients.push({
        id: n.nutrient.id,
        name: n.nutrient.name,
        unit: n.nutrient.unitName,
        amount: n.amount,
      });
    }
  }
  const get = (id: number) => (byId.has(id) ? (byId.get(id) as number) : null);
  const branded = d.dataType === "Branded";
  const portions = branded
    ? [brandedPortion(d.servingSize, d.servingSizeUnit, d.householdServingFullText)].filter(
        (p): p is Portion => p !== null
      )
    : genericPortions(d.foodPortions);
  return {
    id: null,
    source: "usda",
    sourceId: String(d.fdcId),
    name: branded ? titleCase(d.description) : d.description,
    brand: branded ? d.brandOwner || d.brandName || null : null,
    dataType: d.dataType,
    category:
      d.foodCategory?.description ??
      d.brandedFoodCategory ??
      d.wweiaFoodCategory?.wweiaFoodCategoryDescription ??
      null,
    kcal100: pickKcal(get),
    protein100: get(N.protein) ?? 0,
    carbs100: get(N.carbs) ?? 0,
    fat100: get(N.fat) ?? 0,
    fiber100: get(N.fiber),
    sugar100: get(N.sugar),
    satFat100: get(N.satFat),
    sodium100: get(N.sodium),
    portions,
    generic: !branded,
    nutrients: nutrients.length ? nutrients : null,
  };
}

// ---- public API --------------------------------------------------------------

// ---- ranking -----------------------------------------------------------------
// USDA's own relevance order is poor ("chicken breast" leads with lunchmeat), so we
// pull a wider net of whole foods and re-rank them ourselves.

const STOP_WORDS = new Set(["and", "or", "of", "the", "a", "an", "with", "in", "on", "to", "for"]);
const NOISE =
  /\b(lunchmeat|luncheon|breaded|battered|fried|nuggets?|canned|baby food|infant|formula|dehydrated|freeze-dried|powdered?|imitation|substitute|fast foods?|restaurant|school lunch|frozen meal|entree|giblets?|gizzards?|liver|hearts?|necks?|backs?|capons?|stewing|bratwurst|sausages?|hot dogs?|frankfurters?|croquettes?|pilaf|paper|crackers?|dressing|benedict|creamed)\b/i;
const VARIANT = /\b(skin eaten|skin not eaten|yield after cooking|bone removed|from fast food|from restaurant)\b/i;

function stem(w: string) {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}
function wordsOf(s: string) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stem);
}

/** Higher is better: every query word present, leading word matches, short, no odd variants. */
function scoreGeneric(f: FoodSummary, qWords: string[], queryHasNoise: boolean): number {
  const words = wordsOf(f.name);
  let score = 0;
  for (const t of qWords) {
    if (words.includes(t)) score += 3;
    else if (words.some((w) => w.startsWith(t) || t.startsWith(w))) score += 1.5;
  }
  if (qWords.length && words[0] === qWords[0]) score += 2;
  score -= Math.max(0, words.length - qWords.length) * 0.15;
  if (!queryHasNoise && NOISE.test(f.name)) score -= 3;
  if (VARIANT.test(f.name)) score -= 0.75;
  if (f.dataType === "Foundation") score += 0.5;
  else if (f.dataType === "SR Legacy") score += 0.3;
  if (f.kcal100 === 0 && f.protein100 === 0 && f.carbs100 === 0 && f.fat100 === 0) score -= 1;
  return score;
}

/** Generic whole foods (re-ranked) first, then branded products. Throws UsdaError on API trouble. */
export async function searchUsda(query: string, perType = 8): Promise<FoodSummary[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return memoized(`search:${q.toLowerCase()}:${perType}`, 6 * 60 * 60 * 1000, async () => {
    const body = (dataType: string[], pageSize: number) =>
      JSON.stringify({ query: q, pageSize, dataType });
    const [generic, branded] = await Promise.all([
      usdaFetch<RawSearchResponse>("/foods/search", { method: "POST", body: body(GENERIC_DATA_TYPES, 30) }),
      usdaFetch<RawSearchResponse>("/foods/search", { method: "POST", body: body(["Branded"], perType) }),
    ]);
    const qWords = wordsOf(q);
    const queryHasNoise = NOISE.test(q);
    const ranked = (generic.foods ?? [])
      .map(fromSearch)
      .map((f) => ({ f, s: scoreGeneric(f, qWords, queryHasNoise) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, perType)
      .map((x) => x.f);
    return [...ranked, ...(branded.foods ?? []).map(fromSearch)];
  });
}

/** Full record for one FDC id: all nutrients plus household portions. */
export async function getUsdaFood(fdcId: string): Promise<FoodDetail> {
  const id = fdcId.trim();
  if (!/^\d+$/.test(id)) throw new UsdaError("Invalid USDA id.", 400);
  return memoized(`food:${id}`, 24 * 60 * 60 * 1000, async () => {
    const d = await usdaFetch<RawDetail>(`/food/${id}?format=full`);
    return fromDetail(d);
  });
}

// Shared food-tracking types and pure helpers (safe to import from client components).

export type FoodSource = "usda" | "off" | "custom";

/** `nominal` marks a custom-food serving with no known weight ("1 scoop"); grams is then a 100 g stand-in. */
export type Portion = { label: string; grams: number; nominal?: boolean };

export type FoodSummary = {
  /** Local foods.id once cached or custom; null for a USDA hit nobody has picked yet. */
  id: string | null;
  source: FoodSource;
  sourceId: string;
  name: string;
  brand: string | null;
  dataType: string | null;
  category: string | null;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number | null;
  sugar100: number | null;
  satFat100: number | null;
  sodium100: number | null;
  portions: Portion[];
  /** Whole-food data (USDA Foundation / SR Legacy / FNDDS, or custom) rather than a branded product. */
  generic: boolean;
};

export type NutrientAmount = { id: number; name: string; unit: string; amount: number };

export type FoodDetail = FoodSummary & { nutrients: NutrientAmount[] | null };

export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};
export function isMeal(x: string): x is Meal {
  return (MEALS as readonly string[]).includes(x);
}

/** Units every food gets on top of its own portions. */
export const UNIT_PORTIONS: Portion[] = [
  { label: "g", grams: 1 },
  { label: "oz", grams: 28.3495 },
];

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function macrosForGrams(
  food: Pick<FoodSummary, "kcal100" | "protein100" | "carbs100" | "fat100">,
  grams: number
): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcal100 * f),
    protein: round1(food.protein100 * f),
    carbs: round1(food.carbs100 * f),
    fat: round1(food.fat100 * f),
  };
}

/** Format a quantity like 1, 1.5, 0.33 without float noise. */
export function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function fmtGrams(n: number) {
  return n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

// ---- foods table <-> FoodSummary --------------------------------------------

export type FoodRow = {
  id: string;
  source: FoodSource;
  source_id: string;
  owner_id: string | null;
  name: string;
  brand: string | null;
  data_type: string | null;
  category: string | null;
  kcal_100: number | string;
  protein_100: number | string;
  carbs_100: number | string;
  fat_100: number | string;
  fiber_100: number | string | null;
  sugar_100: number | string | null;
  sat_fat_100: number | string | null;
  sodium_100: number | string | null;
  portions: Portion[] | null;
};

export const FOOD_ROW_COLUMNS =
  "id, source, source_id, owner_id, name, brand, data_type, category, kcal_100, protein_100, carbs_100, fat_100, fiber_100, sugar_100, sat_fat_100, sodium_100, portions";

const num = (v: number | string | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v);
const numOrNull = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

export function isGenericDataType(dataType: string | null, source: FoodSource) {
  if (source === "custom") return true;
  if (source === "off") return false;
  return dataType !== null && dataType !== "Branded";
}

export function rowToSummary(r: FoodRow): FoodSummary {
  return {
    id: r.id,
    source: r.source,
    sourceId: r.source_id,
    name: r.name,
    brand: r.brand,
    dataType: r.data_type,
    category: r.category,
    kcal100: num(r.kcal_100),
    protein100: num(r.protein_100),
    carbs100: num(r.carbs_100),
    fat100: num(r.fat_100),
    fiber100: numOrNull(r.fiber_100),
    sugar100: numOrNull(r.sugar_100),
    satFat100: numOrNull(r.sat_fat_100),
    sodium100: numOrNull(r.sodium_100),
    portions: Array.isArray(r.portions) ? r.portions : [],
    generic: isGenericDataType(r.data_type, r.source),
  };
}

export function detailToRow(f: FoodDetail, ownerId: string | null) {
  return {
    source: f.source,
    source_id: f.sourceId,
    owner_id: ownerId,
    name: f.name,
    brand: f.brand,
    data_type: f.dataType,
    category: f.category,
    kcal_100: f.kcal100,
    protein_100: f.protein100,
    carbs_100: f.carbs100,
    fat_100: f.fat100,
    fiber_100: f.fiber100,
    sugar_100: f.sugar100,
    sat_fat_100: f.satFat100,
    sodium_100: f.sodium100,
    portions: f.portions,
    nutrients: f.nutrients,
    updated_at: new Date().toISOString(),
  };
}

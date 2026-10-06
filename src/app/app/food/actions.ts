"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DATE_RE, ENTRY_COLUMNS } from "@/lib/food/server";
import {
  FOOD_ROW_COLUMNS,
  isMeal,
  macrosForGrams,
  round1,
  rowToSummary,
  type FoodRow,
  type FoodSummary,
} from "@/lib/food/types";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function ensureUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

function fail<T>(e: unknown, fallback: string): ActionResult<T> {
  return { ok: false, error: e instanceof Error ? e.message : fallback };
}

function refreshDiary() {
  revalidatePath("/app/food");
  revalidatePath("/app");
}

const finite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

// ---- log a catalog food ----------------------------------------------------------

export type AddEntryInput = {
  date: string;
  meal: string;
  foodId: string;
  portionLabel: string;
  /** grams of ONE portion */
  portionGrams: number;
  quantity: number;
  /** custom serving with no known weight: macros scale off a 100 g stand-in, grams are not stored */
  nominal?: boolean;
};

export async function addFoodEntry(input: AddEntryInput): Promise<ActionResult> {
  try {
    const { supabase, user } = await ensureUser();
    if (!DATE_RE.test(input.date)) return { ok: false, error: "That date looks wrong." };
    if (!isMeal(input.meal)) return { ok: false, error: "Pick a meal." };
    const qty = finite(input.quantity);
    const perPortion = finite(input.portionGrams);
    if (!(qty > 0 && qty <= 100)) return { ok: false, error: "Quantity must be between 0 and 100." };
    if (!(perPortion > 0 && perPortion <= 10000)) return { ok: false, error: "Portion size looks off." };

    const { data: row } = await supabase
      .from("foods")
      .select(FOOD_ROW_COLUMNS)
      .eq("id", input.foodId)
      .maybeSingle();
    if (!row) return { ok: false, error: "Food not found." };
    const food = rowToSummary(row as FoodRow);

    const grams = qty * perPortion;
    const m = macrosForGrams(food, grams);
    const { error } = await supabase.from("food_log_entries").insert({
      user_id: user.id,
      log_date: input.date,
      meal: input.meal,
      food_id: food.id,
      name: food.name,
      brand: food.brand,
      quantity: round1(qty),
      portion_label: String(input.portionLabel ?? "").trim().slice(0, 80) || null,
      grams: input.nominal ? null : round1(grams),
      kcal: m.kcal,
      protein_g: m.protein,
      carbs_g: m.carbs,
      fat_g: m.fat,
      fiber_g: food.fiber100 !== null ? round1((food.fiber100 * grams) / 100) : null,
    });
    if (error) return { ok: false, error: error.message };
    refreshDiary();
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e, "Could not log that food.");
  }
}

// ---- quick add (calories + macros, no food) --------------------------------------

export type QuickAddInput = {
  date: string;
  meal: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export async function addQuickEntry(input: QuickAddInput): Promise<ActionResult> {
  try {
    const { supabase, user } = await ensureUser();
    if (!DATE_RE.test(input.date)) return { ok: false, error: "That date looks wrong." };
    if (!isMeal(input.meal)) return { ok: false, error: "Pick a meal." };
    const kcal = Math.round(finite(input.kcal));
    const protein = round1(finite(input.protein) || 0);
    const carbs = round1(finite(input.carbs) || 0);
    const fat = round1(finite(input.fat) || 0);
    if (!(kcal >= 0 && kcal <= 10000)) return { ok: false, error: "Enter the calories." };
    if ([protein, carbs, fat].some((v) => v < 0 || v > 2000)) {
      return { ok: false, error: "Macros look off." };
    }
    const { error } = await supabase.from("food_log_entries").insert({
      user_id: user.id,
      log_date: input.date,
      meal: input.meal,
      food_id: null,
      name: String(input.name ?? "").trim().slice(0, 80) || "Quick add",
      quantity: 1,
      portion_label: null,
      grams: null,
      kcal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
    });
    if (error) return { ok: false, error: error.message };
    refreshDiary();
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e, "Could not add that.");
  }
}

// ---- custom foods -------------------------------------------------------------

export type CustomFoodInput = {
  name: string;
  brand?: string;
  servingLabel: string;
  /** grams in one serving; omit when unknown ("1 scoop") */
  servingGrams?: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
};

export async function createCustomFood(input: CustomFoodInput): Promise<ActionResult<FoodSummary>> {
  try {
    const { supabase, user } = await ensureUser();
    const name = String(input.name ?? "").trim().slice(0, 120);
    if (!name) return { ok: false, error: "Give the food a name." };
    const servingLabel = String(input.servingLabel ?? "").trim().slice(0, 60) || "1 serving";
    const servingGrams = finite(input.servingGrams ?? NaN);
    const hasWeight = servingGrams > 0 && servingGrams <= 5000;
    const kcal = finite(input.kcal);
    const protein = finite(input.protein) || 0;
    const carbs = finite(input.carbs) || 0;
    const fat = finite(input.fat) || 0;
    const fiber = finite(input.fiber ?? NaN);
    if (!(kcal >= 0 && kcal <= 10000)) return { ok: false, error: "Enter calories per serving." };
    if ([protein, carbs, fat].some((v) => v < 0 || v > 2000)) {
      return { ok: false, error: "Macros look off." };
    }

    // Store per 100 g. Without a weight, one serving stands in for 100 g (and is flagged nominal).
    // Keep three decimals so scaling back to the serving reproduces the entered numbers.
    const factor = hasWeight ? 100 / servingGrams : 1;
    const per100 = (v: number) => Math.round(v * factor * 1000) / 1000;
    const { data, error } = await supabase
      .from("foods")
      .insert({
        source: "custom",
        owner_id: user.id,
        name,
        brand: String(input.brand ?? "").trim().slice(0, 80) || null,
        data_type: "Custom",
        kcal_100: per100(kcal),
        protein_100: per100(protein),
        carbs_100: per100(carbs),
        fat_100: per100(fat),
        fiber_100: fiber >= 0 ? per100(fiber) : null,
        portions: [
          hasWeight
            ? { label: servingLabel, grams: round1(servingGrams) }
            : { label: servingLabel, grams: 100, nominal: true },
        ],
      })
      .select(FOOD_ROW_COLUMNS)
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Could not save the food." };
    return { ok: true, data: rowToSummary(data as FoodRow) };
  } catch (e) {
    return fail(e, "Could not save the food.");
  }
}

// ---- form actions used by the diary page -----------------------------------------

export async function deleteFoodEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!id) return;
  const { supabase, user } = await ensureUser();
  const { error } = await supabase
    .from("food_log_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  refreshDiary();
  if (DATE_RE.test(date)) revalidatePath(`/app/food?date=${date}`);
}

/** Copy every entry from one day onto another (used for "copy yesterday"). */
export async function copyDay(formData: FormData) {
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from === to) return;
  const { supabase, user } = await ensureUser();
  const { data, error } = await supabase
    .from("food_log_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", user.id)
    .eq("log_date", from)
    .order("created_at");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return;
  const rows = data.map((e) => ({
    user_id: user.id,
    log_date: to,
    meal: e.meal,
    food_id: e.food_id,
    name: e.name,
    brand: e.brand,
    quantity: e.quantity,
    portion_label: e.portion_label,
    grams: e.grams,
    kcal: e.kcal,
    protein_g: e.protein_g,
    carbs_g: e.carbs_g,
    fat_g: e.fat_g,
    fiber_g: e.fiber_g,
    notes: e.notes,
  }));
  const { error: insErr } = await supabase.from("food_log_entries").insert(rows);
  if (insErr) throw new Error(insErr.message);
  refreshDiary();
}

export async function saveTargets(formData: FormData) {
  const { supabase, user } = await ensureUser();
  const kcal = Math.round(Number(formData.get("kcal")));
  const protein = Math.round(Number(formData.get("protein_g")));
  const carbs = Math.round(Number(formData.get("carbs_g")));
  const fat = Math.round(Number(formData.get("fat_g")));
  const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
  const ok =
    kcal >= 500 && kcal <= 10000 &&
    protein >= 0 && protein <= 1000 &&
    carbs >= 0 && carbs <= 2000 &&
    fat >= 0 && fat <= 1000;
  if (!ok) throw new Error("Those targets look off — calories 500–10,000 and macros in grams.");

  const { error } = await supabase.from("nutrition_targets").upsert(
    {
      user_id: user.id,
      kcal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      note,
      set_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
  refreshDiary();
  redirect("/app/food");
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadTargets } from "@/lib/food/server";

// Used by the static TDEE calculator page (same origin, cookie auth):
//   GET  /api/nutrition/targets → { targets } or 401 when signed out
//   POST /api/nutrition/targets { kcal, protein_g, carbs_g, fat_g, note? } → { ok: true }

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const targets = await loadTargets(supabase, user.id);
    return NextResponse.json({ targets });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load targets" },
      { status: 500 }
    );
  }
}

const inRange = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const kcal = Math.round(Number(body.kcal));
  const protein = Math.round(Number(body.protein_g));
  const carbs = Math.round(Number(body.carbs_g));
  const fat = Math.round(Number(body.fat_g));
  if (
    !inRange(kcal, 500, 10000) ||
    !inRange(protein, 0, 1000) ||
    !inRange(carbs, 0, 2000) ||
    !inRange(fat, 0, 1000)
  ) {
    return NextResponse.json({ error: "Those numbers look off." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.slice(0, 120) : null;

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/app/food");
  revalidatePath("/app");
  return NextResponse.json({ ok: true });
}

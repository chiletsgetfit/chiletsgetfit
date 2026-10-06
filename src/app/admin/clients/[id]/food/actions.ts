"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Admins only");
  return { supabase, user };
}

/** Coach sets a client's daily calorie and macro targets. */
export async function setClientTargets(clientId: string, formData: FormData) {
  const { supabase, user } = await ensureAdmin();
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
      user_id: clientId,
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

  revalidatePath(`/admin/clients/${clientId}/food`);
  revalidatePath("/app/food");
  revalidatePath("/app");
}

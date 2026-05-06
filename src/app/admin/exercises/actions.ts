"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ExerciseState = { error?: string; success?: string };

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

function readForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const muscle_group = String(formData.get("muscle_group") ?? "").trim() || null;
  const equipment = String(formData.get("equipment") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const instructions =
    String(formData.get("instructions") ?? "").trim() || null;
  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  return { name, muscle_group, equipment, category, instructions, video_url };
}

export async function createExercise(
  _prev: ExerciseState,
  formData: FormData
): Promise<ExerciseState> {
  const { supabase } = await ensureAdmin();
  const fields = readForm(formData);

  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase.from("exercises").insert(fields);
  if (error) return { error: error.message };

  revalidatePath("/admin/exercises");
  redirect("/admin/exercises");
}

export async function updateExercise(
  id: string,
  _prev: ExerciseState,
  formData: FormData
): Promise<ExerciseState> {
  const { supabase } = await ensureAdmin();
  const fields = readForm(formData);

  if (!fields.name) return { error: "Name is required." };

  const { error } = await supabase
    .from("exercises")
    .update(fields)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/exercises");
  revalidatePath(`/admin/exercises/${id}`);
  redirect("/admin/exercises");
}

export async function deleteExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) {
    // Don't throw — likely a workout_exercises FK violation. Surface gently.
    redirect(
      `/admin/exercises?error=${encodeURIComponent(
        "Couldn't delete: this exercise is used in one or more workouts."
      )}`
    );
  }
  revalidatePath("/admin/exercises");
}

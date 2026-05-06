"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WorkoutState = { error?: string };

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

function readWorkoutForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const client_id = String(formData.get("client_id") ?? "").trim();
  const scheduled_date =
    String(formData.get("scheduled_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  return { name, client_id, scheduled_date, notes };
}

export async function createWorkout(
  _prev: WorkoutState,
  formData: FormData
): Promise<WorkoutState> {
  const fields = readWorkoutForm(formData);
  if (!fields.name) return { error: "Workout name is required." };
  if (!fields.client_id) return { error: "Pick a client." };

  const { supabase, user } = await ensureAdmin();
  const { data, error } = await supabase
    .from("workouts")
    .insert({ ...fields, created_by: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/workouts");
  redirect(`/admin/workouts/${data.id}`);
}

export async function updateWorkout(
  id: string,
  _prev: WorkoutState,
  formData: FormData
): Promise<WorkoutState> {
  const fields = readWorkoutForm(formData);
  if (!fields.name) return { error: "Workout name is required." };
  if (!fields.client_id) return { error: "Pick a client." };

  const { supabase } = await ensureAdmin();
  const { error } = await supabase
    .from("workouts")
    .update(fields)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/workouts");
  revalidatePath(`/admin/workouts/${id}`);
  redirect(`/admin/workouts/${id}`);
}

export async function deleteWorkout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/workouts");
  redirect("/admin/workouts");
}

export type AddExerciseState = { error?: string; ok?: boolean };

export async function addExerciseToWorkout(
  workoutId: string,
  _prev: AddExerciseState,
  formData: FormData
): Promise<AddExerciseState> {
  const exercise_id = String(formData.get("exercise_id") ?? "").trim();
  if (!exercise_id) return { error: "Pick an exercise." };

  const target_sets = parseInt(String(formData.get("target_sets") ?? "3"), 10);
  const target_reps = String(formData.get("target_reps") ?? "").trim() || null;
  const target_weight =
    parseFloat(String(formData.get("target_weight") ?? "")) || null;
  const rest_seconds =
    parseInt(String(formData.get("rest_seconds") ?? ""), 10) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { supabase } = await ensureAdmin();

  const { data: existing } = await supabase
    .from("workout_exercises")
    .select("position")
    .eq("workout_id", workoutId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? 0) + 1;

  const { error } = await supabase.from("workout_exercises").insert({
    workout_id: workoutId,
    exercise_id,
    position,
    target_sets: isNaN(target_sets) ? 3 : target_sets,
    target_reps,
    target_weight,
    rest_seconds,
    notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/workouts/${workoutId}`);
  return { ok: true };
}

export async function removeWorkoutExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!id) return;
  const { supabase } = await ensureAdmin();
  await supabase.from("workout_exercises").delete().eq("id", id);
  if (workoutId) revalidatePath(`/admin/workouts/${workoutId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProgramState = { error?: string };

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

function readProgramForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const days_per_week = parseInt(
    String(formData.get("days_per_week") ?? "3"),
    10
  );
  return {
    name,
    description,
    days_per_week:
      isNaN(days_per_week) || days_per_week < 1 || days_per_week > 7
        ? 3
        : days_per_week,
  };
}

export async function createProgram(
  _prev: ProgramState,
  formData: FormData
): Promise<ProgramState> {
  const fields = readProgramForm(formData);
  if (!fields.name) return { error: "Program name is required." };

  const { supabase, user } = await ensureAdmin();
  const { data, error } = await supabase
    .from("programs")
    .insert({ ...fields, coach_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/programs");
  redirect(`/admin/programs/${data.id}`);
}

export async function updateProgram(
  id: string,
  _prev: ProgramState,
  formData: FormData
): Promise<ProgramState> {
  const fields = readProgramForm(formData);
  if (!fields.name) return { error: "Program name is required." };

  const { supabase } = await ensureAdmin();
  const { error } = await supabase
    .from("programs")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${id}`);
  redirect(`/admin/programs/${id}`);
}

export async function deleteProgram(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/programs");
  redirect("/admin/programs");
}

export type AddDayState = { error?: string; ok?: boolean };

export async function addProgramDay(
  programId: string,
  _prev: AddDayState,
  formData: FormData
): Promise<AddDayState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Day name is required." };

  const { supabase } = await ensureAdmin();

  const { data: existing } = await supabase
    .from("program_days")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? 0) + 1;

  const { error } = await supabase
    .from("program_days")
    .insert({ program_id: programId, name, position });

  if (error) return { error: error.message };

  revalidatePath(`/admin/programs/${programId}`);
  return { ok: true };
}

export async function addDayFromWorkout(
  programId: string,
  _prev: AddDayState,
  formData: FormData
): Promise<AddDayState> {
  const workout_id = String(formData.get("workout_id") ?? "").trim();
  if (!workout_id) return { error: "Pick a workout to import." };

  const overrideName = String(formData.get("name") ?? "").trim() || null;

  const { supabase } = await ensureAdmin();

  const { data: workout, error: workoutErr } = await supabase
    .from("workouts")
    .select("id, name")
    .eq("id", workout_id)
    .single();
  if (workoutErr || !workout) return { error: "Workout not found." };

  const { data: workoutExercises, error: weErr } = await supabase
    .from("workout_exercises")
    .select(
      "exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes"
    )
    .eq("workout_id", workout_id)
    .order("position");
  if (weErr) return { error: weErr.message };

  const { data: existing } = await supabase
    .from("program_days")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? 0) + 1;

  const { data: day, error: dayErr } = await supabase
    .from("program_days")
    .insert({
      program_id: programId,
      name: overrideName ?? workout.name,
      position,
    })
    .select("id")
    .single();
  if (dayErr || !day) return { error: dayErr?.message ?? "Failed to add day." };

  if (workoutExercises && workoutExercises.length > 0) {
    const rows = workoutExercises.map((we) => ({
      program_day_id: day.id,
      exercise_id: we.exercise_id,
      position: we.position,
      target_sets: we.target_sets,
      target_reps: we.target_reps,
      target_weight: we.target_weight,
      rest_seconds: we.rest_seconds,
      notes: we.notes,
    }));
    const { error: insertErr } = await supabase
      .from("program_day_exercises")
      .insert(rows);
    if (insertErr) {
      // Best-effort rollback so we don't leave an orphan empty day
      await supabase.from("program_days").delete().eq("id", day.id);
      return { error: insertErr.message };
    }
  }

  revalidatePath(`/admin/programs/${programId}`);
  return { ok: true };
}

export async function removeProgramDay(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  if (!id) return;
  const { supabase } = await ensureAdmin();
  await supabase.from("program_days").delete().eq("id", id);
  if (programId) revalidatePath(`/admin/programs/${programId}`);
}

export type AddDayExerciseState = { error?: string; ok?: boolean };

export async function addExerciseToDay(
  programDayId: string,
  programId: string,
  _prev: AddDayExerciseState,
  formData: FormData
): Promise<AddDayExerciseState> {
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
    .from("program_day_exercises")
    .select("position")
    .eq("program_day_id", programDayId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? 0) + 1;

  const { error } = await supabase.from("program_day_exercises").insert({
    program_day_id: programDayId,
    exercise_id,
    position,
    target_sets: isNaN(target_sets) ? 3 : target_sets,
    target_reps,
    target_weight,
    rest_seconds,
    notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/programs/${programId}`);
  return { ok: true };
}

export async function removeDayExercise(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  if (!id) return;
  const { supabase } = await ensureAdmin();
  await supabase.from("program_day_exercises").delete().eq("id", id);
  if (programId) revalidatePath(`/admin/programs/${programId}`);
}

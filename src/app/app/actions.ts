"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ensureClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function startProgramDay(formData: FormData) {
  const programDayId = String(formData.get("program_day_id") ?? "");
  if (!programDayId) throw new Error("Day is required.");

  const { supabase, user } = await ensureClient();

  // Make sure this user actually has an active assignment for this day's program.
  const { data: day, error: dayErr } = await supabase
    .from("program_days")
    .select("id, name, program_id")
    .eq("id", programDayId)
    .single();
  if (dayErr || !day) throw new Error("Day not found.");

  const { data: assignment } = await supabase
    .from("client_programs")
    .select("id")
    .eq("client_id", user.id)
    .eq("program_id", day.program_id)
    .is("ended_at", null)
    .maybeSingle();
  if (!assignment) throw new Error("You are not assigned to this program.");

  // Create the workout shell.
  const { data: workout, error: workoutErr } = await supabase
    .from("workouts")
    .insert({
      client_id: user.id,
      created_by: user.id,
      name: day.name,
      scheduled_date: new Date().toISOString().slice(0, 10),
      program_day_id: day.id,
      client_program_id: assignment.id,
    })
    .select("id")
    .single();
  if (workoutErr || !workout) {
    throw new Error(workoutErr?.message ?? "Could not start workout.");
  }

  // Copy the program day's exercises onto it.
  const { data: dayExercises } = await supabase
    .from("program_day_exercises")
    .select(
      "exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes"
    )
    .eq("program_day_id", programDayId)
    .order("position");

  if (dayExercises && dayExercises.length > 0) {
    const rows = dayExercises.map((e) => ({
      workout_id: workout.id,
      exercise_id: e.exercise_id,
      position: e.position,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
      target_weight: e.target_weight,
      rest_seconds: e.rest_seconds,
      notes: e.notes,
    }));
    await supabase.from("workout_exercises").insert(rows);
  }

  revalidatePath("/app");
  redirect(`/app/workouts/${workout.id}`);
}

export async function logSet(
  workoutExerciseId: string,
  setNumber: number,
  formData: FormData
) {
  const repsRaw = String(formData.get("reps") ?? "").trim();
  const weightRaw = String(formData.get("weight") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const reps = repsRaw ? parseInt(repsRaw, 10) : null;
  const weight = weightRaw ? parseFloat(weightRaw) : null;

  const { supabase, user } = await ensureClient();

  // Verify the workout_exercise belongs to this user.
  const { data: we, error: weErr } = await supabase
    .from("workout_exercises")
    .select("workout_id, workouts!inner ( client_id )")
    .eq("id", workoutExerciseId)
    .single();
  if (weErr || !we) throw new Error("Exercise not found.");
  const workout = Array.isArray(we.workouts) ? we.workouts[0] : we.workouts;
  if (workout?.client_id !== user.id) throw new Error("Not your workout.");

  const { error } = await supabase.from("set_logs").upsert(
    {
      workout_exercise_id: workoutExerciseId,
      set_number: setNumber,
      reps: reps !== null && !isNaN(reps) ? reps : null,
      weight: weight !== null && !isNaN(weight) ? weight : null,
      notes,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "workout_exercise_id,set_number" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/app/workouts/${we.workout_id}`);
}

export async function clearSet(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!id) return;

  const { supabase, user } = await ensureClient();

  // RLS will scope the delete to this user's own logs, but make it explicit.
  const { data: log } = await supabase
    .from("set_logs")
    .select(
      "id, workout_exercise_id, workout_exercises!inner ( workouts!inner ( client_id ) )"
    )
    .eq("id", id)
    .single();
  const we = Array.isArray(log?.workout_exercises)
    ? log?.workout_exercises[0]
    : log?.workout_exercises;
  const workout = Array.isArray(we?.workouts) ? we?.workouts[0] : we?.workouts;
  if (workout?.client_id !== user.id) throw new Error("Not your set.");

  await supabase.from("set_logs").delete().eq("id", id);
  if (workoutId) revalidatePath(`/app/workouts/${workoutId}`);
}

export async function completeWorkout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Workout id required.");

  const { supabase, user } = await ensureClient();
  const { error } = await supabase
    .from("workouts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/app");
  revalidatePath(`/app/workouts/${id}`);
  redirect("/app");
}

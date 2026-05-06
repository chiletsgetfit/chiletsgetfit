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

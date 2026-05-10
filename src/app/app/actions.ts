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

export async function startCustomWorkout() {
  const { supabase, user } = await ensureClient();

  const today = new Date();
  const monthDay = today.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      client_id: user.id,
      created_by: user.id,
      name: `Custom · ${monthDay}`,
      scheduled_date: today.toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error || !workout) {
    throw new Error(error?.message ?? "Could not start workout.");
  }

  revalidatePath("/app");
  redirect(`/app/workouts/${workout.id}`);
}

export type AddClientExerciseState = { error?: string; ok?: boolean };

export async function addExerciseToMyWorkout(
  workoutId: string,
  _prev: AddClientExerciseState,
  formData: FormData
): Promise<AddClientExerciseState> {
  const exercise_id = String(formData.get("exercise_id") ?? "").trim();
  if (!exercise_id) return { error: "Pick an exercise." };

  const target_sets = parseInt(String(formData.get("target_sets") ?? "3"), 10);

  const { supabase, user } = await ensureClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("client_id, completed_at")
    .eq("id", workoutId)
    .single();
  if (!workout || workout.client_id !== user.id) {
    return { error: "Workout not found." };
  }
  if (workout.completed_at) {
    return { error: "Workout is already complete." };
  }

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
    target_sets: isNaN(target_sets) || target_sets < 1 ? 3 : target_sets,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/workouts/${workoutId}`);
  return { ok: true };
}

export async function removeExerciseFromMyWorkout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!id) return;

  const { supabase, user } = await ensureClient();

  const { data: we } = await supabase
    .from("workout_exercises")
    .select("workout_id, workouts!inner ( client_id )")
    .eq("id", id)
    .single();
  const w = Array.isArray(we?.workouts) ? we?.workouts[0] : we?.workouts;
  if (w?.client_id !== user.id) throw new Error("Not your workout.");

  await supabase.from("workout_exercises").delete().eq("id", id);
  if (workoutId) revalidatePath(`/app/workouts/${workoutId}`);
}

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
};

export async function savePushSubscription(sub: SubscriptionInput) {
  const { supabase, user } = await ensureClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: sub.userAgent ?? null,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string) {
  const { supabase, user } = await ensureClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
}

export type RenameState = { error?: string; ok?: boolean };

export async function renameWorkout(
  workoutId: string,
  _prev: RenameState,
  formData: FormData
): Promise<RenameState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name can't be empty." };
  if (name.length > 80) return { error: "Keep it under 80 characters." };

  const { supabase, user } = await ensureClient();
  const { error } = await supabase
    .from("workouts")
    .update({ name })
    .eq("id", workoutId)
    .eq("client_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/app/workouts/${workoutId}`);
  revalidatePath("/app/history");
  return { ok: true };
}

export type SaveTemplateState = { error?: string; ok?: boolean };

export async function saveWorkoutAsTemplate(
  workoutId: string,
  _prev: SaveTemplateState,
  formData: FormData
): Promise<SaveTemplateState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (name.length > 80) return { error: "Keep it under 80 characters." };

  const { supabase, user } = await ensureClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("client_id")
    .eq("id", workoutId)
    .single();
  if (!workout || workout.client_id !== user.id) {
    return { error: "Not your workout." };
  }

  const { data: saved, error: savedErr } = await supabase
    .from("saved_client_workouts")
    .insert({ client_id: user.id, name })
    .select("id")
    .single();
  if (savedErr || !saved) {
    return { error: savedErr?.message ?? "Could not save." };
  }

  const { data: exercises } = await supabase
    .from("workout_exercises")
    .select(
      "exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes"
    )
    .eq("workout_id", workoutId)
    .order("position");

  if (exercises && exercises.length > 0) {
    const rows = exercises.map((e) => ({
      saved_workout_id: saved.id,
      exercise_id: e.exercise_id,
      position: e.position,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
      target_weight: e.target_weight,
      rest_seconds: e.rest_seconds,
      notes: e.notes,
    }));
    const { error: insertErr } = await supabase
      .from("saved_client_workout_exercises")
      .insert(rows);
    if (insertErr) {
      // Roll back the empty parent so the user can retry cleanly.
      await supabase.from("saved_client_workouts").delete().eq("id", saved.id);
      return { error: insertErr.message };
    }
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function startSavedWorkout(formData: FormData) {
  const savedWorkoutId = String(formData.get("saved_workout_id") ?? "");
  if (!savedWorkoutId) throw new Error("Missing saved workout.");

  const { supabase, user } = await ensureClient();

  const { data: saved } = await supabase
    .from("saved_client_workouts")
    .select("id, name, client_id")
    .eq("id", savedWorkoutId)
    .single();
  if (!saved || saved.client_id !== user.id) throw new Error("Not yours.");

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      client_id: user.id,
      created_by: user.id,
      name: saved.name,
      scheduled_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error || !workout) {
    throw new Error(error?.message ?? "Could not start workout.");
  }

  const { data: savedExercises } = await supabase
    .from("saved_client_workout_exercises")
    .select(
      "exercise_id, position, target_sets, target_reps, target_weight, rest_seconds, notes"
    )
    .eq("saved_workout_id", savedWorkoutId)
    .order("position");

  if (savedExercises && savedExercises.length > 0) {
    const rows = savedExercises.map((e) => ({
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

export async function deleteSavedWorkout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { supabase, user } = await ensureClient();
  await supabase
    .from("saved_client_workouts")
    .delete()
    .eq("id", id)
    .eq("client_id", user.id);
  revalidatePath("/app");
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

import { createClient } from "@/lib/supabase/server";
import { flattenSetLogs, type LoggedSet } from "@/lib/progress";

/** All set logs from completed workouts for the signed-in client. */
export async function loadClientSetLogs(): Promise<LoggedSet[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("set_logs")
    .select(
      `
      set_number,
      reps,
      weight,
      workout_exercises!inner (
        exercise_id,
        workout_id,
        exercises ( id, name, muscle_group ),
        workouts!inner ( id, client_id, completed_at )
      )
    `,
    )
    .eq("workout_exercises.workouts.client_id", user.id)
    .not("workout_exercises.workouts.completed_at", "is", null);

  return flattenSetLogs(data as Parameters<typeof flattenSetLogs>[0]);
}

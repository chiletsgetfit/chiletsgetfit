"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { addDayFromWorkout, type AddDayState } from "../actions";

type WorkoutOption = {
  id: string;
  name: string;
};

const initial: AddDayState = {};

export function ImportWorkoutForm({
  programId,
  workouts,
}: {
  programId: string;
  workouts: WorkoutOption[];
}) {
  const action = addDayFromWorkout.bind(null, programId);
  const [state, formAction] = useActionState<AddDayState, FormData>(
    action,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [workoutId, setWorkoutId] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setWorkoutId("");
      setName("");
    }
  }, [state.ok]);

  if (workouts.length === 0) return null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Import an existing workout as a day
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Copies the workout's exercises into a new program day.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="import-workout"
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Workout
          </label>
          <select
            id="import-workout"
            name="workout_id"
            required
            value={workoutId}
            onChange={(e) => {
              setWorkoutId(e.target.value);
              if (!name) {
                const picked = workouts.find((w) => w.id === e.target.value);
                if (picked) setName(picked.name);
              }
            }}
            className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
          >
            <option value="" disabled>
              Pick a workout...
            </option>
            {workouts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="import-day-name"
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Day name (optional)
          </label>
          <input
            id="import-day-name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leg Day"
            className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
          />
        </div>

        <Submit disabled={!workoutId} />
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-red-300">{state.error}</p>
      )}
    </form>
  );
}

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Importing..." : "Import"}
    </button>
  );
}

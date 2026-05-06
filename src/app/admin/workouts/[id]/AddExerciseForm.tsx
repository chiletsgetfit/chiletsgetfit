"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  addExerciseToWorkout,
  type AddExerciseState,
} from "../actions";

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
};

const initial: AddExerciseState = {};

export function AddExerciseForm({
  workoutId,
  exercises,
}: {
  workoutId: string;
  exercises: Exercise[];
}) {
  const action = addExerciseToWorkout.bind(null, workoutId);
  const [state, formAction] = useActionState<AddExerciseState, FormData>(
    action,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  // Group exercises by muscle group for the <optgroup>s
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const key = ex.muscle_group ?? "Other";
    (acc[key] ??= []).push(ex);
    return acc;
  }, {});
  const muscleGroups = Object.keys(grouped).sort();

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
        Add exercise
      </h2>

      <div className="mt-5 grid gap-4">
        <div>
          <label
            htmlFor="exercise_id"
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Exercise
          </label>
          <select
            id="exercise_id"
            name="exercise_id"
            required
            defaultValue=""
            className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
          >
            <option value="" disabled>
              Pick from library
            </option>
            {muscleGroups.map((group) => (
              <optgroup key={group} label={group}>
                {grouped[group].map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <NumField label="Sets" name="target_sets" defaultValue="3" min={1} />
          <Field
            label="Reps"
            name="target_reps"
            placeholder="8-12, 5, AMRAP"
          />
          <NumField
            label="Weight"
            name="target_weight"
            placeholder="lbs"
            step="0.5"
          />
          <NumField label="Rest (sec)" name="rest_seconds" placeholder="90" />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Notes (optional)
          </label>
          <input
            id="notes"
            name="notes"
            type="text"
            placeholder="Tempo, RPE, cues..."
            className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add to workout"}
    </button>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
      />
    </div>
  );
}

function NumField({
  label,
  name,
  placeholder,
  defaultValue,
  min,
  step,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  min?: number;
  step?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
      />
    </div>
  );
}

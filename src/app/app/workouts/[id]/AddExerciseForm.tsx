"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addExerciseToMyWorkout,
  type AddClientExerciseState,
} from "../../actions";
import {
  ExercisePicker,
  type PickerExercise,
} from "@/components/ExercisePicker";

const initial: AddClientExerciseState = {};

export function AddExerciseForm({
  workoutId,
  exercises,
}: {
  workoutId: string;
  exercises: PickerExercise[];
}) {
  const action = addExerciseToMyWorkout.bind(null, workoutId);
  const [state, formAction] = useActionState<AddClientExerciseState, FormData>(
    action,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSelectedId("");
      setQuery("");
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Add an exercise
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <ExercisePicker
          exercises={exercises}
          selectedId={selectedId}
          query={query}
          onSelect={setSelectedId}
          onQueryChange={setQuery}
          inputId={`add-ex-search-${workoutId}`}
          listboxId={`add-ex-listbox-${workoutId}`}
          label="Exercise"
        />
        <input type="hidden" name="exercise_id" value={selectedId} />

        <div>
          <label
            htmlFor={`add-ex-sets-${workoutId}`}
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Sets
          </label>
          <input
            id={`add-ex-sets-${workoutId}`}
            name="target_sets"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={3}
            className="mt-2 block h-11 w-20 rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
          />
        </div>

        <Submit disabled={!selectedId} />
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
      {pending ? "Adding..." : "+ Add"}
    </button>
  );
}

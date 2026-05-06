"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addExerciseToDay,
  type AddDayExerciseState,
} from "../actions";
import {
  ExercisePicker,
  type PickerExercise,
} from "@/components/ExercisePicker";

const initial: AddDayExerciseState = {};

export function AddDayExerciseForm({
  programId,
  programDayId,
  exercises,
}: {
  programId: string;
  programDayId: string;
  exercises: PickerExercise[];
}) {
  const action = addExerciseToDay.bind(null, programDayId, programId);
  const [state, formAction] = useActionState<AddDayExerciseState, FormData>(
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
      className="rounded-2xl border border-zinc-800 bg-black/40 p-4 sm:p-5"
    >
      <div className="grid gap-4">
        <ExercisePicker
          exercises={exercises}
          selectedId={selectedId}
          query={query}
          onSelect={setSelectedId}
          onQueryChange={setQuery}
          inputId={`exercise-search-${programDayId}`}
          listboxId={`exercise-listbox-${programDayId}`}
          label="Add exercise"
        />
        <input type="hidden" name="exercise_id" value={selectedId} />

        <div className="grid gap-3 sm:grid-cols-4">
          <NumField
            label="Sets"
            name="target_sets"
            id={`sets-${programDayId}`}
            defaultValue="3"
            min={1}
          />
          <Field
            label="Reps"
            name="target_reps"
            id={`reps-${programDayId}`}
            placeholder="8-12, 5, AMRAP"
          />
          <NumField
            label="Weight"
            name="target_weight"
            id={`weight-${programDayId}`}
            placeholder="lbs"
            step="0.5"
          />
          <NumField
            label="Rest (sec)"
            name="rest_seconds"
            id={`rest-${programDayId}`}
            placeholder="90"
          />
        </div>

        <div>
          <label
            htmlFor={`notes-${programDayId}`}
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Notes (optional)
          </label>
          <input
            id={`notes-${programDayId}`}
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
        <Submit disabled={!selectedId} />
      </div>
    </form>
  );
}

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add to day"}
    </button>
  );
}

function Field({
  label,
  name,
  id,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  id: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
      >
        {label}
      </label>
      <input
        id={id}
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
  id,
  placeholder,
  defaultValue,
  min,
  step,
}: {
  label: string;
  name: string;
  id: string;
  placeholder?: string;
  defaultValue?: string;
  min?: number;
  step?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
      >
        {label}
      </label>
      <input
        id={id}
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

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { renameWorkout, type RenameState } from "../../actions";

const initial: RenameState = {};

export function WorkoutTitle({
  workoutId,
  defaultName,
}: {
  workoutId: string;
  defaultName: string;
}) {
  const action = renameWorkout.bind(null, workoutId);
  const [state, formAction] = useActionState<RenameState, FormData>(
    action,
    initial
  );
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // After server confirms save, drop out of edit mode and clear errors.
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {name}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input
        ref={inputRef}
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        maxLength={80}
        className="block h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 text-2xl font-semibold tracking-tight text-white outline-none focus:border-gold-500 sm:text-3xl"
      />
      <div className="flex items-center gap-3">
        <SaveButton />
        <button
          type="button"
          onClick={() => {
            setName(defaultName);
            setEditing(false);
          }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
        >
          Cancel
        </button>
        {state.error && (
          <p className="text-xs text-red-300">{state.error}</p>
        )}
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-full bg-gold-500 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save name"}
    </button>
  );
}

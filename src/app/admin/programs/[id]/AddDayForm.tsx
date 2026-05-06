"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addProgramDay, type AddDayState } from "../actions";

const initial: AddDayState = {};

export function AddDayForm({ programId }: { programId: string }) {
  const action = addProgramDay.bind(null, programId);
  const [state, formAction] = useActionState<AddDayState, FormData>(
    action,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label
          htmlFor="day-name"
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Add a day
        </label>
        <input
          id="day-name"
          name="name"
          type="text"
          required
          placeholder="Push, Pull, Legs, Upper, Lower..."
          className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
      </div>
      <Submit />
      {state.error && (
        <p className="text-sm text-red-300">{state.error}</p>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400 disabled:opacity-60"
    >
      {pending ? "Adding..." : "+ Add day"}
    </button>
  );
}

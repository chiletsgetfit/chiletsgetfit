"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveWorkoutAsTemplate,
  type SaveTemplateState,
} from "../../actions";

const initial: SaveTemplateState = {};

export function SaveTemplateForm({
  workoutId,
  defaultName,
}: {
  workoutId: string;
  defaultName: string;
}) {
  const action = saveWorkoutAsTemplate.bind(null, workoutId);
  const [state, formAction] = useActionState<SaveTemplateState, FormData>(
    action,
    initial
  );
  const [open, setOpen] = useState(false);

  // Auto-collapse after success and show a green confirmation for a moment.
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-gold-400"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Save as template
      </button>
    );
  }

  if (state.ok) {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
        ✓ Saved — it&apos;ll appear on your home screen.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Save this workout as a template
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        It&apos;ll show up under &ldquo;Pick today&apos;s session&rdquo; so you
        can repeat it.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="name"
          type="text"
          defaultValue={defaultName}
          maxLength={80}
          required
          autoFocus
          className="block h-10 flex-1 rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
        <div className="flex items-center gap-2">
          <Submit />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      </div>
      {state.error && (
        <p className="mt-2 text-xs text-red-300">{state.error}</p>
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
      className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

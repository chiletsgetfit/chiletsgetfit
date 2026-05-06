"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ProgramState } from "./actions";

type Defaults = {
  name?: string | null;
  description?: string | null;
  days_per_week?: number | null;
};

const initial: ProgramState = {};

export function ProgramForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (
    prev: ProgramState,
    formData: FormData
  ) => Promise<ProgramState> | ProgramState;
  defaults?: Defaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<ProgramState, FormData>(
    action,
    initial
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div>
        <label
          htmlFor="name"
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Program name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Push Pull Legs"
          className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
      </div>

      <div>
        <label
          htmlFor="days_per_week"
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Days per week
        </label>
        <input
          id="days_per_week"
          name="days_per_week"
          type="number"
          inputMode="numeric"
          min={1}
          max={7}
          defaultValue={defaults?.days_per_week ?? 3}
          className="mt-2 block h-11 w-32 rounded-xl border border-zinc-800 bg-black px-4 text-base text-white outline-none focus:border-gold-500"
        />
        <p className="mt-2 text-xs text-zinc-500">
          How many sessions the client should hit each week.
        </p>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          placeholder="3-day push/pull/legs split focused on hypertrophy."
          className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <Link
          href={cancelHref}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200"
        >
          Cancel
        </Link>
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 disabled:opacity-60"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

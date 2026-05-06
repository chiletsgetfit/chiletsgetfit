"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setPassword, type SetPasswordState } from "./actions";

const initial: SetPasswordState = {};

export function SetPasswordForm() {
  const [state, action] = useActionState(setPassword, initial);

  return (
    <form action={action} className="space-y-5">
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
      />

      {state.error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gold-500 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save password"}
    </button>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
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
        type={type}
        autoComplete={autoComplete}
        required
        minLength={8}
        className="mt-2 block h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white outline-none focus:border-gold-500"
      />
    </div>
  );
}

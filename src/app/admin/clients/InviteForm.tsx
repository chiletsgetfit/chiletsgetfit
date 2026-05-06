"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { inviteClient, type InviteState } from "./actions";

const initial: InviteState = {};

export function InviteForm() {
  const [state, action] = useActionState(inviteClient, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
        Invite a client
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        They&apos;ll get an email to set their password and finish signing up.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          name="fullName"
          type="text"
          required
          autoComplete="off"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="off"
        />
      </div>

      {state.error && (
        <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {state.success}
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
      {pending ? "Sending..." : "Send invite"}
    </button>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
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
        required={required}
        autoComplete={autoComplete}
        className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white outline-none focus:border-gold-500"
      />
    </div>
  );
}

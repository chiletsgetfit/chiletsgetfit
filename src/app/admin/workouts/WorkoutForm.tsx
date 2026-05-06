"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { type WorkoutState } from "./actions";

type Client = { id: string; full_name: string | null; email: string | null };

type Defaults = {
  name?: string | null;
  client_id?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
};

export function WorkoutForm({
  action,
  clients,
  defaults = {},
  submitLabel,
  cancelHref,
}: {
  action: (prev: WorkoutState, formData: FormData) => Promise<WorkoutState>;
  clients: Client[];
  defaults?: Defaults;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<WorkoutState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Workout name"
        name="name"
        defaultValue={defaults.name ?? ""}
        placeholder="e.g. Push Day, Lower A, Conditioning"
        required
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="client_id"
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            Client
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={defaults.client_id ?? ""}
            className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
          >
            <option value="" disabled>
              Pick a client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? c.email ?? "Unnamed"}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Scheduled date"
          name="scheduled_date"
          type="date"
          defaultValue={defaults.scheduled_date ?? ""}
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes ?? ""}
          placeholder="Anything you want the client to know about this session..."
          className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Link
          href={cancelHref}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </Link>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
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

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
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
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
      />
    </div>
  );
}

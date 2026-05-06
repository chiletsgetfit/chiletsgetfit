"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { type ExerciseState } from "./actions";

const MUSCLE_GROUPS = [
  "Chest",
  "Lats",
  "Upper Back",
  "Traps",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
  "Lower Back",
  "Full Body",
];

const EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Smith Machine",
  "Trap Bar",
  "EZ Bar",
  "Plate",
  "Band",
  "Sled",
  "Other",
];

const CATEGORIES = [
  "compound",
  "isolation",
  "olympic",
  "plyometric",
  "core",
  "conditioning",
];

type Defaults = {
  name?: string | null;
  muscle_group?: string | null;
  equipment?: string | null;
  category?: string | null;
  instructions?: string | null;
  video_url?: string | null;
};

export function ExerciseForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: ExerciseState, formData: FormData) => Promise<ExerciseState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ExerciseState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Name"
        name="name"
        defaultValue={defaults.name ?? ""}
        required
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          label="Muscle group"
          name="muscle_group"
          options={MUSCLE_GROUPS}
          defaultValue={defaults.muscle_group ?? ""}
        />
        <SelectField
          label="Equipment"
          name="equipment"
          options={EQUIPMENT}
          defaultValue={defaults.equipment ?? ""}
        />
        <SelectField
          label="Category"
          name="category"
          options={CATEGORIES}
          defaultValue={defaults.category ?? ""}
        />
      </div>

      <div>
        <label
          htmlFor="instructions"
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
        >
          Instructions
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={4}
          defaultValue={defaults.instructions ?? ""}
          placeholder="Cues, setup, key form points..."
          className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
        />
      </div>

      <Field
        label="Video URL (optional)"
        name="video_url"
        type="url"
        defaultValue={defaults.video_url ?? ""}
        placeholder="https://youtube.com/..."
      />

      {state.error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Link
          href="/admin/exercises"
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

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
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
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-2 block h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-base text-white outline-none focus:border-gold-500"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

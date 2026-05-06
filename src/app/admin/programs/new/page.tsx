import Link from "next/link";
import { ProgramForm } from "../ProgramForm";
import { createProgram } from "../actions";

export default function NewProgramPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/programs"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to programs
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        New program
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Create the program shell first, then add days and exercises on the next
        screen.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <ProgramForm
          action={createProgram}
          submitLabel="Create &amp; add days"
          cancelHref="/admin/programs"
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProgramForm } from "../../ProgramForm";
import { updateProgram } from "../../actions";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, name, description, days_per_week")
    .eq("id", id)
    .single();

  if (!program) notFound();

  const action = updateProgram.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href={`/admin/programs/${id}`}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-gold-400"
      >
        ← Back to program
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Edit program
      </h1>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <ProgramForm
          action={action}
          defaults={program}
          submitLabel="Save changes"
          cancelHref={`/admin/programs/${id}`}
        />
      </div>
    </div>
  );
}

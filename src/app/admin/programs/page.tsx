import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select(
      "id, name, description, days_per_week, created_at, program_days ( id )"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Programming
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Programs
          </h1>
          <p className="mt-2 text-zinc-400">
            Reusable templates — PPL, Upper/Lower, etc. Assign one to a client
            and they pick which day to do.
          </p>
        </div>
        <Link
          href="/admin/programs/new"
          className="inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
        >
          + New program
        </Link>
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.25em] text-zinc-500">
        {programs?.length ?? 0}{" "}
        {programs?.length === 1 ? "program" : "programs"} total
      </p>

      {programs && programs.length > 0 ? (
        <ul className="mt-3 divide-y divide-zinc-900 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {programs.map((p) => {
            const dayCount = Array.isArray(p.program_days)
              ? p.program_days.length
              : 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/programs/${p.id}`}
                  className="flex flex-col gap-2 p-4 transition-colors hover:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {p.days_per_week}x / week
                      {" · "}
                      {dayCount} {dayCount === 1 ? "day" : "days"} built
                      {p.description && (
                        <>
                          {" · "}
                          <span className="text-zinc-500">{p.description}</span>
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-sm text-zinc-400">
            No programs yet. Build a template you can re-assign to any client.
          </p>
          <Link
            href="/admin/programs/new"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gold-500 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-gold-400"
          >
            + New program
          </Link>
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./InviteForm";
import { assignProgram, toggleClientActive, unassignProgram } from "./actions";
import { NudgeForm } from "./NudgeForm";

export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: programs }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, active, created_at, password_set")
        .eq("role", "client")
        .order("created_at", { ascending: false }),
      supabase
        .from("programs")
        .select("id, name, days_per_week")
        .order("name"),
      supabase
        .from("client_programs")
        .select("client_id, program_id, target_per_week, started_at, programs ( name )")
        .is("ended_at", null),
    ]);

  const activeByClient = new Map<
    string,
    { programId: string; programName: string; targetPerWeek: number; startedAt: string }
  >();
  for (const a of assignments ?? []) {
    const program = Array.isArray(a.programs) ? a.programs[0] : a.programs;
    activeByClient.set(a.client_id, {
      programId: a.program_id,
      programName: program?.name ?? "(unknown)",
      targetPerWeek: a.target_per_week,
      startedAt: a.started_at,
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Roster
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clients
          </h1>
        </div>
        <span className="text-sm text-zinc-400">
          {clients?.length ?? 0} total
        </span>
      </div>

      <div className="mt-8">
        <InviteForm />
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {clients && clients.length > 0 ? (
          <ul className="divide-y divide-zinc-900">
            {clients.map((c) => {
              const active = activeByClient.get(c.id);
              return (
                <li key={c.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {c.full_name ?? "(no name)"}
                      </p>
                      <p className="text-sm text-zinc-400">{c.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <StatusBadge active={c.active} />
                        {!c.password_set && (
                          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">
                            Pending password
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <NudgeForm clientId={c.id} />
                      <form action={toggleClientActive}>
                        <input type="hidden" name="clientId" value={c.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={(!c.active).toString()}
                        />
                        <button
                          type="submit"
                          className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                            c.active
                              ? "border-zinc-700 text-zinc-300 hover:border-red-700 hover:text-red-400"
                              : "border-zinc-700 text-zinc-300 hover:border-emerald-600 hover:text-emerald-400"
                          }`}
                        >
                          {c.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                      Current program
                    </p>
                    {active ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="text-sm text-white">
                          {active.programName}{" "}
                          <span className="text-zinc-500">
                            · {active.targetPerWeek}x / week · since{" "}
                            {new Date(active.startedAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </p>
                        <form action={unassignProgram}>
                          <input type="hidden" name="clientId" value={c.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400"
                          >
                            End
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">
                        No active program.
                      </p>
                    )}

                    {programs && programs.length > 0 && (
                      <form
                        action={assignProgram}
                        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
                      >
                        <input type="hidden" name="clientId" value={c.id} />
                        <select
                          name="programId"
                          required
                          defaultValue=""
                          className="block h-10 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none focus:border-gold-500 sm:flex-1"
                        >
                          <option value="" disabled>
                            {active
                              ? "Switch program..."
                              : "Assign a program..."}
                          </option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.days_per_week}x/week)
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-colors hover:border-gold-400 hover:text-gold-400"
                        >
                          {active ? "Switch" : "Assign"}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-zinc-400">
            No clients yet. Invite your first one above.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
        active
          ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

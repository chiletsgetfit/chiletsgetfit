import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./InviteForm";
import { toggleClientActive } from "./actions";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email, active, created_at, password_set")
    .eq("role", "client")
    .order("created_at", { ascending: false });

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
            {clients.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div>
                  <p className="font-medium">{c.full_name ?? "(no name)"}</p>
                  <p className="text-sm text-zinc-400">{c.email}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <StatusBadge active={c.active} />
                    {!c.password_set && (
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">
                        Pending password
                      </span>
                    )}
                  </div>
                </div>
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
              </li>
            ))}
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

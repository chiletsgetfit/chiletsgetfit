import { createClient } from "@/lib/supabase/server";

export default async function ClientDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "athlete";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Today
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Hey {firstName}.
      </h1>
      <p className="mt-2 text-zinc-400">
        Your workout for today will show up here once your coach assigns one.
      </p>

      <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">
          No workout assigned yet. Check back soon, or message your coach.
        </p>
      </div>
    </div>
  );
}

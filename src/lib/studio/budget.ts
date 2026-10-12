import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Spending caps for paid SerpApi calls (the free plan has 250 a month, 50 an hour).
// Each paid call is written to studio_serp_calls -- a table only the service role
// can touch -- BEFORE counting, so a burst of parallel requests can't slip past.
const PER_HOUR = 15;   // per member
const PER_DAY = 40;    // per member
const ALL_30D = 230;   // everyone together, leaving a little headroom under 250

/** Claims one paid call, or returns the reason it's refused. Fails closed. */
export async function claimSerpCredit(userId: string, kind: "search" | "compare"): Promise<string | null> {
  const db = createAdminClient();
  const { error } = await db.from("studio_serp_calls").insert({ owner_id: userId, kind });
  if (error) {
    console.error("studio_serp_calls insert", error.code, error.message);
    return "The deal finder isn't set up yet (run supabase/15-studio-deals.sql).";
  }
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = () => db.from("studio_serp_calls").select("id", { count: "exact", head: true });
  const [h, d, m] = await Promise.all([
    count().eq("owner_id", userId).gte("at", since(36e5)),
    count().eq("owner_id", userId).gte("at", since(864e5)),
    count().gte("at", since(30 * 864e5)),
  ]);
  if ([h, d, m].some((r) => r.error || r.count == null)) return "Couldn't check the search budget. Try again in a moment.";
  if (h.count! > PER_HOUR) return `That's ${PER_HOUR} price searches this hour — take a breather and try again soon.`;
  if (d.count! > PER_DAY) return `That's ${PER_DAY} price searches today — more tomorrow.`;
  if (m.count! > ALL_30D) return "This month's price searches are nearly used up.";
  return null;
}

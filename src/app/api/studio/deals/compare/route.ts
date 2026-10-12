import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studioApiUser } from "@/lib/studio/access";
import { claimSerpCredit } from "@/lib/studio/budget";
import { median, normalize, type CompareResponse } from "@/lib/studio/deals";
import { SerpApiError, compareStores } from "@/lib/studio/serpapi";

export const maxDuration = 30;

const FRESH_MS = 12 * 60 * 60 * 1000;
const HISTORY_DAYS = 120;
const TOO_OLD = "These results are too old to compare — tap refresh on the search first.";

// GET /api/studio/deals/compare?title=...&token=...&pid=... -> CompareResponse
// Cached by Google's product id when there is one (sizes that share a title stay
// apart), else by title. SerpApi's page tokens expire; the cache key doesn't.
export async function GET(req: Request) {
  const auth = await studioApiUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const params = new URL(req.url).searchParams;
  const title = (params.get("title") ?? "").trim().slice(0, 400);
  const token = (params.get("token") ?? "").trim().slice(0, 4096);
  const pid = (params.get("pid") ?? "").trim().slice(0, 100);
  if (!title) return NextResponse.json({ error: "Which product?" }, { status: 400 });

  const key = pid ? `compare:pid:${pid}` : `compare:${normalize(title).slice(0, 380)}`;
  const { data: hit, error: readErr } = await supabase
    .from("studio_price_cache")
    .select("payload, fetched_at")
    .eq("key", key)
    .maybeSingle();
  if (readErr) {
    console.error("studio_price_cache read", readErr.code, readErr.message);
    return NextResponse.json({ error: "The deal finder isn't set up yet (price cache missing)." }, { status: 503 });
  }
  const cached = hit ? (hit.payload as CompareResponse) : null;
  if (cached && Date.now() - new Date(hit!.fetched_at).getTime() < FRESH_MS) {
    return NextResponse.json({ ...cached, cached: true });
  }
  if (!token) {
    if (cached) return NextResponse.json({ ...cached, cached: true, stale: true });
    return NextResponse.json({ error: TOO_OLD }, { status: 410 });
  }

  const refused = await claimSerpCredit(user.id, "compare");
  if (refused) {
    if (cached) return NextResponse.json({ ...cached, cached: true, stale: true });
    return NextResponse.json({ error: refused }, { status: 429 });
  }

  try {
    const found = await compareStores(token);
    // An empty comparison is almost always an expired token: say so, cache nothing.
    if (!found.offers.length) {
      if (cached) return NextResponse.json({ ...cached, cached: true, stale: true });
      return NextResponse.json({ error: TOO_OLD }, { status: 410 });
    }

    // Usual price = the regular (pre-sale) price on EARLIER days, from both members'
    // searches; today's own results never count, so the first look has no history.
    const productKey = title.toLowerCase();
    const { data: seen } = await supabase
      .from("studio_price_seen")
      .select("price, original_price, observed_at")
      .eq("product_key", productKey)
      .gte("observed_at", new Date(Date.now() - HISTORY_DAYS * 864e5).toISOString())
      .lt("observed_at", new Date(Date.now() - FRESH_MS).toISOString())
      .order("observed_at", { ascending: false })
      .limit(500);
    const rows = seen ?? [];
    const days = new Set(rows.map((r) => String(r.observed_at).slice(0, 10))).size;
    const regular = median(rows.map((r) => Number(r.original_price ?? r.price)));

    const res: CompareResponse = {
      ...found,
      title: found.title || title,
      typical: median(found.offers.map((o) => o.price ?? NaN)),
      history: regular != null && days >= 2 ? { median: regular, days } : null,
      cached: false,
      fetchedAt: new Date().toISOString(),
    };

    const admin = createAdminClient();
    const priced = res.offers.filter((o) => o.price != null);
    const [cw, hw] = await Promise.all([
      admin.from("studio_price_cache").upsert({ key, payload: res, fetched_at: res.fetchedAt }),
      priced.length
        ? admin.from("studio_price_seen").insert(
            priced.map((o) => ({
              owner_id: user.id,
              query: title.slice(0, 200),
              product: title, // keyed on the listing title, same as searches, so history lines up
              store: o.store.slice(0, 200),
              price: o.price,
              original_price: o.originalPrice,
              link: o.link?.slice(0, 2000) ?? null,
            }))
          )
        : Promise.resolve({ error: null }),
    ]);
    if (cw.error) console.error("studio_price_cache upsert", cw.error.code, cw.error.message);
    if (hw.error) console.error("studio_price_seen insert", hw.error.code, hw.error.message);
    return NextResponse.json(res);
  } catch (e) {
    if (cached) return NextResponse.json({ ...cached, cached: true, stale: true });
    if (e instanceof SerpApiError && e.status !== 429 && e.status !== 503) {
      return NextResponse.json({ error: TOO_OLD }, { status: 410 });
    }
    const status = e instanceof SerpApiError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't compare stores." }, { status });
  }
}

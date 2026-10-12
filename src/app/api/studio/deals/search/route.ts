import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studioApiUser } from "@/lib/studio/access";
import { claimSerpCredit } from "@/lib/studio/budget";
import { normalize, type SearchResponse } from "@/lib/studio/deals";
import { SerpApiError, shoppingSearch } from "@/lib/studio/serpapi";

export const maxDuration = 30;

const FRESH_MS = 12 * 60 * 60 * 1000;       // a repeat search within 12 h costs no SerpApi credit
const EMPTY_FRESH_MS = 3 * 60 * 60 * 1000;  // "nothing found" is re-checked sooner

// GET /api/studio/deals/search?q=pillow+talk+lipstick&sale=1[&fresh=1] -> SearchResponse
export async function GET(req: Request) {
  const auth = await studioApiUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, user } = auth;

  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const saleOnly = params.get("sale") === "1";
  const fresh = params.get("fresh") === "1";
  if (q.length < 2) return NextResponse.json({ error: "Type at least two letters." }, { status: 400 });

  const key = `search:${saleOnly ? "sale:" : ""}${normalize(q)}`;
  const { data: hit, error: readErr } = await supabase
    .from("studio_price_cache")
    .select("payload, fetched_at")
    .eq("key", key)
    .maybeSingle();
  // Fail closed: without a working cache every repeat would spend a credit.
  if (readErr) {
    console.error("studio_price_cache read", readErr.code, readErr.message);
    return NextResponse.json({ error: "The deal finder isn't set up yet (price cache missing)." }, { status: 503 });
  }
  const cached = hit ? (hit.payload as SearchResponse) : null;
  if (cached && !fresh) {
    const ttl = cached.listings.length ? FRESH_MS : EMPTY_FRESH_MS;
    if (Date.now() - new Date(hit!.fetched_at).getTime() < ttl) return NextResponse.json({ ...cached, cached: true });
  }

  const refused = await claimSerpCredit(user.id, "search");
  if (refused) {
    if (cached) return NextResponse.json({ ...cached, cached: true, stale: true });
    return NextResponse.json({ error: refused }, { status: 429 });
  }

  try {
    const listings = await shoppingSearch(q, saleOnly);
    const res: SearchResponse = { query: q, saleOnly, listings, cached: false, fetchedAt: new Date().toISOString() };
    const admin = createAdminClient();
    const priced = listings.filter((l) => l.price != null);
    const [cw, hw] = await Promise.all([
      admin.from("studio_price_cache").upsert({ key, payload: res, fetched_at: res.fetchedAt }),
      priced.length
        ? admin.from("studio_price_seen").insert(
            priced.map((l) => ({
              owner_id: user.id,
              query: q,
              product: l.title.slice(0, 400),
              store: l.store.slice(0, 200),
              price: l.price,
              original_price: l.oldPrice,
              link: l.link?.slice(0, 2000) ?? null,
            }))
          )
        : Promise.resolve({ error: null }),
    ]);
    if (cw.error) console.error("studio_price_cache upsert", cw.error.code, cw.error.message);
    if (hw.error) console.error("studio_price_seen insert", hw.error.code, hw.error.message);
    return NextResponse.json(res);
  } catch (e) {
    // Older saved results beat an error when SerpApi is out or over its limit.
    if (cached) return NextResponse.json({ ...cached, cached: true, stale: true });
    const status = e instanceof SerpApiError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Price search failed." }, { status });
  }
}

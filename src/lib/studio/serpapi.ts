import "server-only";

// SerpApi (serpapi.com) Google Shopping engines for the studio deal finder. Key
// in SERPAPI_KEY (Vercel + .env.local). Free plan: 250 searches a month, 50 an
// hour; the account endpoint used for the credit count is free.

import type { Credits, Listing, StoreOffer } from "./deals";

const BASE = "https://serpapi.com";

export class SerpApiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const BAD_KEY = "The deal finder's SerpApi key isn't valid (check SERPAPI_KEY).";

function key(): string {
  const k = process.env.SERPAPI_KEY;
  if (!k) throw new SerpApiError("The deal finder isn't switched on yet (SERPAPI_KEY is missing).", 503);
  return k;
}

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// Links and images come from third-party listings: only plain web addresses get
// through (images https only), so nothing like "javascript:" reaches an href/src.
const url = (v: unknown, httpsOnly = false) => {
  const s = str(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || (!httpsOnly && u.protocol === "http:") ? u.toString() : null;
  } catch {
    return null;
  }
};
// "$1,234.50" -> 1234.5 (used when the extracted_ number is missing)
const parseMoney = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

async function call(params: Record<string, string>): Promise<Json> {
  const u = `${BASE}/search.json?${new URLSearchParams({ ...params, api_key: key() })}`;
  let r: Response;
  try {
    r = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new SerpApiError("The price search timed out. Try again in a moment.");
  }
  const body = (await r.json().catch(() => ({}))) as Json;
  const err = str(body.error);
  // No matches comes back as 200 + an error sentence: that's an empty answer, not a failure.
  if (r.ok && err && /hasn't returned any results/i.test(err)) return { ...body, shopping_results: [], product_results: {} };
  if (r.status === 401 || /invalid api key/i.test(err ?? "")) throw new SerpApiError(BAD_KEY, 503);
  if (r.status === 429) {
    throw new SerpApiError(
      /run out of searches/i.test(err ?? "")
        ? "This month's free price searches are used up."
        : "Too many price searches this hour (the free plan allows 50). Try again in a bit.",
      429
    );
  }
  if (!r.ok || err) throw new SerpApiError(err ?? `Price search failed (${r.status}).`);
  return body;
}

export async function shoppingSearch(q: string, saleOnly: boolean): Promise<Listing[]> {
  const body = await call({
    engine: "google_shopping",
    q,
    gl: "us",
    hl: "en",
    ...(saleOnly ? { on_sale: "true" } : {}),
  });
  const rows = Array.isArray(body.shopping_results) ? (body.shopping_results as Json[]) : [];
  return rows.slice(0, 40).map((r) => {
    const tags = [
      ...(Array.isArray(r.extensions) ? (r.extensions as unknown[]).map(str) : []),
      str(r.tag),
    ].filter((t): t is string => !!t);
    const price = num(r.extracted_price) ?? parseMoney(r.price);
    let oldPrice = num(r.extracted_old_price) ?? parseMoney(r.old_price);
    // No "was" price but the listing says "25% off": work the was-price back out.
    if (oldPrice == null && price != null) {
      const pct = [...tags, str(r.snippet) ?? ""].join(" ").match(/(\d{1,2})\s*%\s*off/i);
      if (pct) oldPrice = Math.round((price / (1 - Number(pct[1]) / 100)) * 100) / 100;
    }
    return {
      title: str(r.title) ?? "Untitled",
      store: str(r.source) ?? "Unknown store",
      price,
      oldPrice,
      link: url(r.product_link) ?? url(r.link),
      thumbnail: url(r.thumbnail, true) ?? url(r.serpapi_thumbnail, true),
      rating: num(r.rating),
      reviews: num(r.reviews),
      token: str(r.immersive_product_page_token),
      productId: str(r.product_id),
      multipleStores: r.multiple_sources === true,
    };
  });
}

export async function compareStores(pageToken: string): Promise<{
  title: string;
  brand: string | null;
  priceRange: string | null;
  thumbnail: string | null;
  offers: StoreOffer[];
}> {
  const body = await call({ engine: "google_immersive_product", page_token: pageToken, more_stores: "true" });
  const p = (body.product_results ?? {}) as Json;
  const stores = Array.isArray(p.stores) ? (p.stores as Json[]) : [];
  const thumbs = Array.isArray(p.thumbnails) ? (p.thumbnails as unknown[]) : [];
  return {
    title: str(p.title) ?? "",
    brand: str(p.brand),
    priceRange: str(p.price_range),
    thumbnail: url(thumbs[0], true),
    offers: stores.map((s) => ({
      store: str(s.name) ?? "Unknown store",
      price: num(s.extracted_price) ?? parseMoney(s.price),
      originalPrice: num(s.extracted_original_price) ?? parseMoney(s.original_price),
      discount: str(s.discount),
      tag: str(s.tag),
      shipping: num(s.shipping_extracted) ?? parseMoney(s.shipping),
      total: num(s.extracted_total) ?? parseMoney(s.total),
      link: url(s.link),
      rating: num(s.rating),
    })),
  };
}

/** Searches left this month (and this hour). SerpApi's account endpoint doesn't use up a search. */
export async function credits(): Promise<Credits> {
  const k = key(); // outside the try: "not switched on" must not read as "couldn't reach"
  let r: Response;
  try {
    r = await fetch(`${BASE}/account.json?${new URLSearchParams({ api_key: k })}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new SerpApiError("Couldn't reach SerpApi for the search count.");
  }
  const a = (await r.json().catch(() => ({}))) as Json;
  if (r.status === 401 || /invalid api key/i.test(str(a.error) ?? "")) throw new SerpApiError(BAD_KEY, 503);
  if (!r.ok || str(a.error)) throw new SerpApiError(`Couldn't read search credits (${r.status}).`);
  const perHour = num(a.account_rate_limit_per_hour);
  const thisHour = num(a.this_hour_searches);
  return {
    left: num(a.total_searches_left) ?? num(a.plan_searches_left),
    perMonth: num(a.searches_per_month),
    used: num(a.this_month_usage),
    hourLeft: perHour != null && thisHour != null ? Math.max(0, perHour - thisHour) : null,
  };
}

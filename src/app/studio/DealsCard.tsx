"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SALE_SHORTCUTS,
  looksTooCheap,
  median,
  money,
  pctBelow,
  type CompareResponse,
  type Credits,
  type Listing,
  type SearchResponse,
} from "@/lib/studio/deals";

const RED = "#B91C1C";
const GREEN = "#4E7A5C";
const SERIF = { fontFamily: "var(--font-studio-serif), Georgia, 'Times New Roman', serif" };
const card = "rounded-xl border border-[#1a1a1a1f] bg-white";
const label = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#1a1a1a]";
const muted = "text-[#1a1a1a99]";
const linkBtn = "text-[11px] underline decoration-[#1a1a1a33] underline-offset-2 hover:decoration-[#1a1a1a] disabled:opacity-50";

type Compare = CompareResponse | "loading" | { error: string };

class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError((body as { error?: string }).error ?? `Request failed (${r.status})`, r.status);
  return body as T;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).toLowerCase();

/**
 * "Find the best price": Google Shopping across stores via SerpApi. A new search is
 * one SerpApi credit, "compare stores" one more; repeats within 12 h are free (the
 * server caches them), and the server caps spending per hour / day / month.
 */
export function DealsCard({ onSaveIdea }: { onSaveIdea: (title: string, notes: string) => void }) {
  const [q, setQ] = useState("");
  const [saleOnly, setSaleOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [compare, setCompare] = useState<Record<string, Compare>>({});
  const [credits, setCredits] = useState<Credits | null>(null);
  const [off, setOff] = useState(""); // not switched on yet / key not valid

  const loadCredits = useCallback(async () => {
    try {
      setCredits(await getJson<Credits>("/api/studio/deals/credits"));
      setOff("");
    } catch (e) {
      if (e instanceof HttpError && e.status === 503) setOff(e.message);
    }
  }, []);
  useEffect(() => { loadCredits(); }, [loadCredits]);

  const search = async (query: string, sale: boolean, fresh = false) => {
    const text = query.trim();
    if (busy) return;
    if (text.length < 2) {
      setError("Type at least two letters.");
      return;
    }
    setBusy(true);
    setError("");
    setCompare({});
    try {
      const res = await getJson<SearchResponse>(
        `/api/studio/deals/search?${new URLSearchParams({ q: text, ...(sale ? { sale: "1" } : {}), ...(fresh ? { fresh: "1" } : {}) })}`
      );
      setResult(res);
    } catch (e) {
      setResult(null); // never leave another search's list under this error
      setError((e as Error).message);
    } finally {
      setBusy(false);
      loadCredits();
    }
  };

  // Per row: two stores' rows for the same product each open their own table.
  const openCompare = async (l: Listing, k: string) => {
    const c = compare[k];
    if (c === "loading") return; // a second tap must not pay twice
    if (c && !("error" in c)) {
      setCompare((m) => { const n = { ...m }; delete n[k]; return n; }); // toggle closed
      return;
    }
    setCompare((m) => ({ ...m, [k]: "loading" }));
    try {
      const res = await getJson<CompareResponse>(
        `/api/studio/deals/compare?${new URLSearchParams({
          title: l.title,
          ...(l.token ? { token: l.token } : {}),
          ...(l.productId ? { pid: l.productId } : {}),
        })}`
      );
      setCompare((m) => ({ ...m, [k]: res }));
    } catch (e) {
      setCompare((m) => ({ ...m, [k]: { error: (e as Error).message } }));
    } finally {
      loadCredits();
    }
  };

  const listings = result
    ? [...result.listings].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    : [];
  // "Cheapest" / "check size" only mean something when the list is one product
  // across stores; a brand's sale search mixes $12 pencils with $49 foundations.
  const sameProduct = !!result && !result.saleOnly;
  const typicalListing = sameProduct ? median(listings.map((l) => l.price ?? NaN)) : null;
  const cheapestIdx = sameProduct
    ? listings.findIndex((l) => l.price != null && !looksTooCheap(l.price, typicalListing))
    : -1;

  const saveListing = (l: Listing) => {
    const pct = pctBelow(l.price, l.oldPrice);
    onSaveIdea(
      `deal: ${l.title} — ${money(l.price)} at ${l.store}${pct && pct > 0 ? ` (${pct}% off)` : ""}`,
      [`${l.store}: ${money(l.price)}${l.oldPrice ? ` (was ${money(l.oldPrice)})` : ""}`, l.link ? `on Google: ${l.link}` : ""]
        .filter(Boolean)
        .join("\n")
    );
  };

  const saveCompare = (c: CompareResponse) => {
    const offers = c.offers.filter((o) => o.price != null).sort((a, b) => a.price! - b.price!);
    const best = offers[0];
    if (!best) return;
    const ref = c.history?.median ?? c.typical;
    const below = pctBelow(best.price, ref);
    onSaveIdea(
      `deal: ${c.title} — ${money(best.price)} at ${best.store}${below && below > 0 ? ` (${below}% under usual)` : ""}`,
      [
        `usual price ${money(ref)}${c.history ? ` (regular price over ${c.history.days} earlier days)` : ` (middle of ${offers.length} stores)`}`,
        ...offers.map((o) => `${o.store}: ${money(o.price)}${o.originalPrice ? ` (was ${money(o.originalPrice)})` : ""}${o.link ? ` — ${o.link}` : ""}`),
      ].join("\n")
    );
  };

  return (
    <section className={`${card} mt-4 px-5 py-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={label}>deal finder</h2>
        {credits?.left != null && (
          <span className="text-[11px]" style={{ color: credits.left < 20 ? RED : "#1a1a1a99" }}>
            {credits.left} price searches left this month
            {credits.hourLeft != null && credits.hourLeft < 10 ? ` · ${credits.hourLeft} this hour` : ""}
          </span>
        )}
      </div>

      {off ? (
        <p className={`text-[13px] ${muted}`} style={SERIF}>
          {/isn't valid/.test(off) ? "the deal finder's SerpApi key isn't valid — check it in Vercel." : "the deal finder switches on once the SerpApi key is added to the site."}
        </p>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(q, saleOnly);
            }}
            className="flex gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="any product — e.g. pillow talk lipstick"
              aria-label="Product to price-check"
              maxLength={120}
              enterKeyHint="search"
              className="min-w-0 flex-1 rounded-lg border border-[#1a1a1a1f] bg-[#FAFAF8] px-3 py-2 text-sm placeholder:text-[#1a1a1a55] focus:border-[#1a1a1a55] focus:outline-none"
            />
            <button type="submit" disabled={busy} className="rounded-lg px-3.5 py-2 text-sm text-white disabled:opacity-50" style={{ background: "#1a1a1a" }}>
              {busy ? "searching…" : "find"}
            </button>
          </form>
          <label className={`mt-2 flex w-fit items-center gap-2 text-[12px] ${muted}`}>
            <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
            on sale only
          </label>

          <div className="mt-3">
            <p className={`mb-1.5 text-[10px] uppercase tracking-[0.1em] ${muted}`}>
              who&apos;s having a sale <span className="normal-case tracking-normal">· 1 search each, free again for 12 hours</span>
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {SALE_SHORTCUTS.map((b) => (
                <button
                  key={b}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setQ(b);
                    search(b, true);
                  }}
                  className="shrink-0 rounded-md px-2.5 py-1 text-[11px] italic disabled:opacity-50"
                  style={{ ...SERIF, color: RED, background: `${RED}10` }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[13px]" style={{ color: RED }}>
              {error}
            </p>
          )}

          {result && (
            <div className="mt-4">
              <p className={`mb-2 text-[11px] ${muted}`}>
                {listings.length} {result.saleOnly ? "sale " : ""}listings for “{result.query}”, cheapest first
                {result.stale
                  ? ` · saved ${when(result.fetchedAt)}, couldn't refresh`
                  : result.cached
                    ? ` · saved ${when(result.fetchedAt)}, no search used`
                    : ""}
                {result.cached && (
                  <>
                    {" · "}
                    <button type="button" disabled={busy} onClick={() => search(result.query, result.saleOnly, true)} className={linkBtn}>
                      refresh (uses 1 search)
                    </button>
                  </>
                )}
              </p>
              <ul className="flex flex-col">
                {listings.map((l, i) => {
                  const pct = pctBelow(l.price, l.oldPrice);
                  const rowKey = `${l.title}|${l.store}|${i}`;
                  const c = compare[rowKey];
                  return (
                    <li key={rowKey} className="border-b border-[#1a1a1a10] py-2.5 last:border-b-0">
                      <div className="flex items-start gap-3">
                        {l.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.thumbnail} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-md bg-[#FAFAF8] object-contain" loading="lazy" />
                        ) : (
                          <span className="h-12 w-12 shrink-0 rounded-md bg-[#FAFAF8]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] leading-snug">{l.title}</p>
                          <p className={`mt-0.5 text-[11px] ${muted}`}>
                            {l.store}
                            {l.multipleStores ? " + more stores" : ""}
                            {l.rating ? ` · ★ ${l.rating}${l.reviews ? ` (${l.reviews.toLocaleString()})` : ""}` : ""}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {(l.token || l.productId) && (
                              <button type="button" onClick={() => openCompare(l, rowKey)} disabled={c === "loading"} className={linkBtn}>
                                {c === "loading" ? "comparing…" : c && !("error" in c) ? "hide stores" : "compare stores"}
                              </button>
                            )}
                            <button type="button" onClick={() => saveListing(l)} className={linkBtn}>
                              save as idea
                            </button>
                            {l.link && (
                              <a href={l.link} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                                see on Google ↗
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[15px] font-medium">{money(l.price)}</p>
                          {l.oldPrice != null && l.oldPrice > (l.price ?? 0) && (
                            <p className="text-[11px] text-[#1a1a1a66] line-through">{money(l.oldPrice)}</p>
                          )}
                          {pct != null && pct > 0 && (
                            <span className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: RED }}>
                              {pct}% off
                            </span>
                          )}
                          {i === cheapestIdx && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em]" style={{ color: GREEN }}>
                              cheapest
                            </p>
                          )}
                          {sameProduct && looksTooCheap(l.price, typicalListing) && (
                            <p className="mt-0.5 text-[10px]" style={{ color: "#B4823C" }}>check size / seller</p>
                          )}
                        </div>
                      </div>
                      {c && <CompareTable c={c} onSave={saveCompare} />}
                    </li>
                  );
                })}
                {listings.length === 0 && (
                  <li className={`py-2 text-[13px] ${muted}`} style={SERIF}>
                    nothing came back — try fewer words{result.saleOnly ? " or turn off “on sale only”" : ""}.
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CompareTable({ c, onSave }: { c: Compare; onSave: (c: CompareResponse) => void }) {
  if (c === "loading") return <p className={`mt-2 pl-[60px] text-[12px] ${muted}`}>comparing stores…</p>;
  if ("error" in c) return <p className="mt-2 pl-[60px] text-[12px]" style={{ color: RED }}>{c.error}</p>;
  const offers = c.offers.filter((o) => o.price != null).sort((a, b) => a.price! - b.price!);
  const ref = c.history?.median ?? c.typical;
  return (
    <div className="mt-2 rounded-lg bg-[#FAFAF8] p-3 sm:ml-[60px]">
      <p className={`mb-2 text-[11px] ${muted}`}>
        usual price <strong className="text-[#1a1a1a]">{money(ref)}</strong>
        {c.history ? ` — regular price over ${c.history.days} earlier days` : ` — middle price of ${offers.length} stores`}
        {c.priceRange ? ` · range ${c.priceRange}` : ""}
        {c.stale ? ` · saved ${when(c.fetchedAt)}, couldn't refresh` : c.cached ? ` · saved ${when(c.fetchedAt)}` : ""}
      </p>
      <ul className="flex flex-col gap-1.5">
        {offers.map((o, i) => {
          const below = pctBelow(o.price, ref);
          return (
            <li key={`${o.store}|${i}`} className="flex items-center gap-2 text-[12px]">
              <span className="min-w-0 flex-1 truncate">
                {o.link ? (
                  <a href={o.link} target="_blank" rel="noopener noreferrer" className="underline decoration-[#1a1a1a33] underline-offset-2 hover:decoration-[#1a1a1a]">
                    {o.store}
                  </a>
                ) : (
                  o.store
                )}
                {o.tag ? <span className="ml-1.5 text-[10px] uppercase tracking-[0.06em]" style={{ color: GREEN }}>{o.tag}</span> : null}
              </span>
              {o.originalPrice != null && o.originalPrice > o.price! && (
                <span className="text-[11px] text-[#1a1a1a55] line-through">{money(o.originalPrice)}</span>
              )}
              <span className="w-14 text-right font-medium">{money(o.price)}</span>
              <span className="w-20 text-right text-[11px]" style={{ color: below != null && below >= 10 ? RED : "#1a1a1a77" }}>
                {looksTooCheap(o.price, ref) ? "check size" : below != null && below > 0 ? `${below}% under` : below != null && below < 0 ? `${-below}% over` : "usual"}
              </span>
            </li>
          );
        })}
        {offers.length === 0 && <li className={`text-[12px] ${muted}`}>no store prices came back.</li>}
      </ul>
      {offers.length > 0 && (
        <button type="button" onClick={() => onSave(c)} className="mt-3 rounded-lg px-3 py-1.5 text-[12px] text-white" style={{ background: RED }}>
          save the best deal as a content idea
        </button>
      )}
    </div>
  );
}

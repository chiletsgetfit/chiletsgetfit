// The studio deal finder: shapes shared by the API routes and the board, plus the
// price maths. Client-safe (no server imports).

/** One listing from a Google Shopping search (a store's offer, or a product many stores sell). */
export type Listing = {
  title: string;
  store: string;
  price: number | null;
  oldPrice: number | null;   // the "was" price when the store marks it on sale
  link: string | null;
  thumbnail: string | null;
  rating: number | null;
  reviews: number | null;
  token: string | null;      // opens the store-by-store comparison (short-lived)
  productId: string | null;  // Google's product id: the comparison's cache key
  multipleStores: boolean;
};

/** One store's offer for a single product, from the comparison. */
export type StoreOffer = {
  store: string;
  price: number | null;
  originalPrice: number | null;
  discount: string | null;   // "22% off"
  tag: string | null;        // "Best price"
  shipping: number | null;
  total: number | null;      // price + shipping when the store says
  link: string | null;
  rating: number | null;
};

export type SearchResponse = {
  query: string;
  saleOnly: boolean;
  listings: Listing[];
  cached: boolean;
  stale?: boolean;           // SerpApi failed, so these are older saved results
  fetchedAt: string;
};

export type CompareResponse = {
  title: string;
  brand: string | null;
  priceRange: string | null;
  thumbnail: string | null;
  offers: StoreOffer[];
  typical: number | null;                                   // median across these stores right now
  history: { median: number; days: number } | null;         // regular price on earlier days (last 120)
  cached: boolean;
  stale?: boolean;
  fetchedAt: string;
};

export type Credits = { left: number | null; perMonth: number | null; used: number | null; hourLeft: number | null };

export function median(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Whole-percent below a reference price (positive = cheaper), or null. */
export function pctBelow(price: number | null, reference: number | null): number | null {
  if (price == null || reference == null || reference <= 0) return null;
  return Math.round(((reference - price) / reference) * 100);
}

/**
 * Suspiciously cheap next to the others: usually a mini, a sample, a single shade
 * of a set, or a marketplace reseller. Shown with a "check size / seller" note.
 */
export function looksTooCheap(price: number | null, typical: number | null): boolean {
  return price != null && typical != null && typical > 0 && price < typical * 0.5;
}

export const money = (n: number | null) =>
  n == null ? "—" : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;

/** Lower-cased, single-spaced: the cache key for a query or product title. */
export const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Quick sale searches for the "who's having a sale" chips.
export const SALE_SHORTCUTS = [
  "Charlotte Tilbury",
  "Rare Beauty",
  "NARS",
  "Dior makeup",
  "Laura Mercier",
  "Fenty Beauty",
  "Huda Beauty",
  "MAC Cosmetics",
  "Makeup By Mario",
  "Hourglass",
];

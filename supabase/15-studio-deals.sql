-- The studio deal finder (/studio, "deal finder" card): price comparison across
-- stores via SerpApi's Google Shopping engines. Three tables:
--   studio_price_cache  -- results reused for 12 hours so a repeat search costs no
--                          SerpApi credit (the free plan has 250 a month)
--   studio_price_seen   -- prices seen, so "usual price" builds up over time
--   studio_serp_calls   -- a ledger of paid SerpApi calls, so the server can cap
--                          spending per hour / day / month
-- Only the server (service role, after its own membership check) writes any of
-- them; members can read the cache and the history.
-- Paste into Supabase SQL Editor and Run (the whole file). Safe to re-run.
-- Needs 14-studio.sql (studio_members, has_studio()).

set role postgres;

create table if not exists public.studio_price_cache (
  key text primary key check (char_length(key) <= 400),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.studio_price_cache enable row level security;

drop policy if exists "members use the price cache" on public.studio_price_cache;
drop policy if exists "members read the price cache" on public.studio_price_cache;
create policy "members read the price cache" on public.studio_price_cache
  for select to authenticated
  using ((select public.has_studio()));

create table if not exists public.studio_price_seen (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  query text not null check (char_length(query) <= 200),
  product text not null check (char_length(product) <= 400),
  store text not null check (char_length(store) <= 200),
  price numeric(10, 2) not null check (price >= 0),
  original_price numeric(10, 2) check (original_price >= 0),
  link text check (char_length(link) <= 2000),
  observed_at timestamptz not null default now()
);
alter table public.studio_price_seen enable row level security;
-- Exact-match key for the history lookup (and its index).
alter table public.studio_price_seen
  add column if not exists product_key text generated always as (lower(product)) stored;
drop index if exists public.idx_studio_price_seen_product;
create index if not exists idx_studio_price_seen_key
  on public.studio_price_seen (product_key, observed_at desc);

-- Price history is shared between members (it's public price data).
drop policy if exists "members read price history" on public.studio_price_seen;
create policy "members read price history" on public.studio_price_seen
  for select to authenticated
  using ((select public.has_studio()));
drop policy if exists "members add own price history" on public.studio_price_seen;
drop policy if exists "members remove own price history" on public.studio_price_seen;

-- Paid-call ledger: no policies at all, so only the service role can touch it.
create table if not exists public.studio_serp_calls (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('search', 'compare')),
  at timestamptz not null default now()
);
alter table public.studio_serp_calls enable row level security;
create index if not exists idx_studio_serp_calls_at on public.studio_serp_calls (at desc, owner_id);

revoke all on table public.studio_price_cache, public.studio_price_seen, public.studio_serp_calls
  from anon, authenticated;
grant select on table public.studio_price_cache, public.studio_price_seen to authenticated;

-- Confirm
select 'studio_price_cache' as t, count(*) from public.studio_price_cache
union all select 'studio_price_seen', count(*) from public.studio_price_seen
union all select 'studio_serp_calls', count(*) from public.studio_serp_calls;

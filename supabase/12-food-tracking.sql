-- 12: Food tracking (Cronometer-style calorie + macro diary).
-- Paste into a FRESH Supabase SQL Editor tab → Run.
--
-- Design notes
-- * foods is a small catalog, not a copy of USDA. A USDA food is cached here the
--   first time someone picks it (via the service role), so the free tier stays
--   tiny. Custom foods are owned by whoever created them.
-- * Nutrients are stored per 100 g so any portion is a plain scale.
-- * food_log_entries snapshot the nutrition at log time, so totals never shift
--   if a food is later corrected.
set role postgres;

-- 1. Foods catalog ------------------------------------------------------------
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('usda', 'off', 'custom')),
  source_id text not null default gen_random_uuid()::text,  -- FDC id, barcode, or generated for custom
  owner_id uuid references public.profiles(id) on delete cascade, -- set for custom foods only
  name text not null,
  brand text,
  barcode text,
  category text,
  data_type text,              -- USDA: Foundation, SR Legacy, Survey (FNDDS), Branded
  kcal_100 numeric not null default 0,
  protein_100 numeric not null default 0,
  carbs_100 numeric not null default 0,
  fat_100 numeric not null default 0,
  fiber_100 numeric,
  sugar_100 numeric,
  sat_fat_100 numeric,
  sodium_100 numeric,          -- mg
  portions jsonb not null default '[]'::jsonb,  -- [{ "label": "1 cup", "grams": 240 }]
  nutrients jsonb,             -- full USDA nutrient list, kept for a future micronutrient panel
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists foods_owner_id_idx on public.foods (owner_id);
create index if not exists foods_barcode_idx on public.foods (barcode) where barcode is not null;

-- 2. Diary entries ------------------------------------------------------------
create table if not exists public.food_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_id uuid references public.foods(id) on delete set null,  -- null for quick adds
  name text not null,          -- snapshot of the food name
  brand text,
  quantity numeric not null default 1,   -- number of portions
  portion_label text,          -- "1 cup", "100 g", "1 serving"
  grams numeric,               -- total grams (quantity × portion grams); null for quick adds
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists food_log_entries_user_date_idx
  on public.food_log_entries (user_id, log_date desc, created_at);

-- 3. Daily targets ------------------------------------------------------------
create table if not exists public.nutrition_targets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  kcal int not null check (kcal between 500 and 10000),
  protein_g int not null check (protein_g between 0 and 1000),
  carbs_g int not null check (carbs_g between 0 and 2000),
  fat_g int not null check (fat_g between 0 and 1000),
  note text,                   -- e.g. "Fat loss · TDEE calculator"
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 4. Row Level Security -------------------------------------------------------
alter table public.foods enable row level security;
alter table public.food_log_entries enable row level security;
alter table public.nutrition_targets enable row level security;

-- foods: everyone signed in can read shared (cached) foods and their own custom
-- foods. Users create/edit/delete only their own custom foods. Cached USDA rows
-- are written by the server with the service role, which bypasses RLS.
drop policy if exists "foods readable by signed-in users" on public.foods;
create policy "foods readable by signed-in users" on public.foods
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid() or public.is_admin());

drop policy if exists "users add own custom foods" on public.foods;
create policy "users add own custom foods" on public.foods
  for insert to authenticated
  with check (owner_id = auth.uid() and source = 'custom');

drop policy if exists "users edit own custom foods" on public.foods;
create policy "users edit own custom foods" on public.foods
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and source = 'custom');

drop policy if exists "users delete own custom foods" on public.foods;
create policy "users delete own custom foods" on public.foods
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "admins manage foods" on public.foods;
create policy "admins manage foods" on public.foods
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- diary: users own their entries; the coach can read every client's diary.
drop policy if exists "users manage own food log" on public.food_log_entries;
create policy "users manage own food log" on public.food_log_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admins read all food logs" on public.food_log_entries;
create policy "admins read all food logs" on public.food_log_entries
  for select to authenticated
  using (public.is_admin());

-- targets: users manage their own; the coach can set anyone's.
drop policy if exists "users manage own targets" on public.nutrition_targets;
create policy "users manage own targets" on public.nutrition_targets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "admins manage all targets" on public.nutrition_targets;
create policy "admins manage all targets" on public.nutrition_targets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Confirm ------------------------------------------------------------------
select table_name, (select count(*) from information_schema.columns c where c.table_name = t.table_name and c.table_schema = 'public') as columns
from information_schema.tables t
where table_schema = 'public' and table_name in ('foods', 'food_log_entries', 'nutrition_targets')
order by table_name;

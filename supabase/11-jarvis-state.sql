-- JARVIS personal dashboard state — end-to-end encrypted blob synced across
-- devices. The `data` column holds ciphertext only (key never leaves the
-- device), so anon-only RLS is intentional. Rows are keyed by a per-device
-- sync code (see SYNC_DEFAULTS in public/jarvis.html).

set role postgres;

create table if not exists public.jarvis_state (
  id text primary key,
  data text not null,
  updated_at timestamptz not null default now()
);

alter table public.jarvis_state enable row level security;

drop policy if exists "anon read"   on public.jarvis_state;
drop policy if exists "anon insert" on public.jarvis_state;
drop policy if exists "anon update" on public.jarvis_state;

create policy "anon read"   on public.jarvis_state for select to anon using (true);
create policy "anon insert" on public.jarvis_state for insert to anon with check (true);
create policy "anon update" on public.jarvis_state for update to anon using (true) with check (true);

-- Web Push subscriptions: one row per (user, browser/device).

set role postgres;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- A user can manage their own subscriptions; admins can read all (so they can
-- send notifications to clients).
create policy "users manage own push subscriptions"
  on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admins read all push subscriptions"
  on public.push_subscriptions
  for select to authenticated
  using (public.is_admin());

-- The studio (/studio, amanda.chiletsgetfit.com): a private daily board --
-- to-dos, content ideas, content pillars and a daily focus line. Built for
-- Amanda (2026-10-12). Paste into Supabase SQL Editor and Run (the whole file).
-- Re-running is safe, but re-adds the two members in section 5.
--
-- Access is a membership table that only the coach (admin) can change. It is
-- deliberately NOT a column on profiles: clients may update their own profile
-- row, so a flag there could be switched on by anyone for themselves.

set role postgres;

-- 1. Who can use the studio -------------------------------------------------

create table if not exists public.studio_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.studio_members enable row level security;

drop policy if exists "members see own membership" on public.studio_members;
create policy "members see own membership" on public.studio_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "admins manage studio members" on public.studio_members;
create policy "admins manage studio members" on public.studio_members
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.has_studio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studio_members where user_id = (select auth.uid()));
$$;

-- 2. Tables (RLS switched on as each is created) -------------------------------
-- Links between rows (idea -> pillar, task -> idea) are keyed on (id, owner_id),
-- so a row can only ever point at the same owner's pillar or idea.

-- Content pillars (the recurring themes she posts under) + a monthly target.
create table if not exists public.studio_pillars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#B91C1C' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  monthly_target int not null default 4 check (monthly_target between 0 and 99),
  position int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
alter table public.studio_pillars enable row level security;
create index if not exists idx_studio_pillars_owner on public.studio_pillars(owner_id, position);
-- One pillar per name per person (the first-visit seed relies on it; re-adding a
-- removed pillar's name brings that pillar back instead).
create unique index if not exists studio_pillars_owner_name on public.studio_pillars(owner_id, name);

-- Content ideas, moving idea -> planned -> shot -> edited -> posted.
create table if not exists public.studio_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  notes text not null default '' check (char_length(notes) <= 5000),
  pillar_id uuid,
  format text not null default 'reel'
    check (format in ('reel', 'carousel', 'single', 'story', 'tiktok', 'other')),
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'shot', 'edited', 'posted')),
  post_date date,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (pillar_id, owner_id) references public.studio_pillars (id, owner_id) on delete set null (pillar_id)
);
alter table public.studio_ideas enable row level security;
create index if not exists idx_studio_ideas_owner on public.studio_ideas(owner_id, post_date);

-- Daily to-dos. Unfinished ones from earlier days carry forward to today.
create table if not exists public.studio_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  day date not null,
  done_at timestamptz,
  idea_id uuid,
  created_at timestamptz not null default now(),
  foreign key (idea_id, owner_id) references public.studio_ideas (id, owner_id) on delete set null (idea_id)
);
alter table public.studio_tasks enable row level security;
create index if not exists idx_studio_tasks_owner_day on public.studio_tasks(owner_id, day);

-- One focus line per day.
create table if not exists public.studio_days (
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  day date not null,
  focus text not null default '' check (char_length(focus) <= 300),
  primary key (owner_id, day)
);
alter table public.studio_days enable row level security;

create or replace function public.studio_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists studio_ideas_touch on public.studio_ideas;
create trigger studio_ideas_touch before update on public.studio_ideas
  for each row execute function public.studio_touch_updated_at();

-- 3. Row level security: each member sees and edits only their own rows -------

drop policy if exists "members manage own pillars" on public.studio_pillars;
create policy "members manage own pillars" on public.studio_pillars
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.has_studio()))
  with check (owner_id = (select auth.uid()) and (select public.has_studio()));

drop policy if exists "members manage own ideas" on public.studio_ideas;
create policy "members manage own ideas" on public.studio_ideas
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.has_studio()))
  with check (owner_id = (select auth.uid()) and (select public.has_studio()));

drop policy if exists "members manage own tasks" on public.studio_tasks;
create policy "members manage own tasks" on public.studio_tasks
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.has_studio()))
  with check (owner_id = (select auth.uid()) and (select public.has_studio()));

drop policy if exists "members manage own days" on public.studio_days;
create policy "members manage own days" on public.studio_days
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.has_studio()))
  with check (owner_id = (select auth.uid()) and (select public.has_studio()));

-- 4. Explicit privileges: only what the board uses, signed-in users only ------

revoke all on table public.studio_members, public.studio_pillars, public.studio_ideas,
  public.studio_tasks, public.studio_days from anon, authenticated;
grant select, insert, update, delete on table public.studio_members, public.studio_pillars,
  public.studio_ideas, public.studio_tasks, public.studio_days to authenticated;
revoke execute on function public.has_studio() from public, anon;
grant execute on function public.has_studio() to authenticated;

-- 5. Members: Amanda, and Andrew (coach) so he can see it working -------------

insert into public.studio_members (user_id)
select p.id from public.profiles p
where p.id in (
  'd2f10d71-bf6d-4565-86cf-f2c5e7d6f9c3',  -- Amanda
  '98b85deb-b8ca-4ea6-81ee-4ab3b68e3955'   -- Andrew (admin)
)
on conflict (user_id) do nothing;

-- 6. Confirm: should list Amanda and Andrew
select p.full_name, p.email from public.studio_members m join public.profiles p on p.id = m.user_id;

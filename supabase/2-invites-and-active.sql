-- Invite-only flow + active/inactive flag.
-- Paste into Supabase SQL Editor and Run.

-- 1. Add columns
alter table public.profiles
  add column if not exists active boolean not null default true,
  add column if not exists password_set boolean not null default false,
  add column if not exists email text;

-- 2. Backfill email from auth.users for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

-- 3. Mark all existing users (just you, the admin) as having a password set,
--    since they predate the invite-only flow.
update public.profiles set password_set = true;

-- 4. Update the auto-create-profile trigger to capture email.
--    password_set stays false by default; invitees set it via /set-password.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

-- 5. Confirm
select id, email, full_name, role, active, password_set
from public.profiles
order by created_at desc;

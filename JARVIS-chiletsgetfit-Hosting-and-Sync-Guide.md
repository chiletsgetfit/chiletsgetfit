# JARVIS on chiletsgetfit.com, with sync across all your devices

Three parts, about 20 minutes total: create the free sync backend, deploy the file to your site, connect your devices.

## Part 1: Create the sync backend (Supabase, free, ~7 min)

Your data is encrypted on your device before it uploads, so Supabase only ever stores unreadable ciphertext. The sync code is the encryption key and it never leaves your devices.

1. Go to supabase.com, sign up (free tier is plenty), and create a new project. Any name and region, and the database password can be anything (you won't need it day to day).
2. When the project is ready, open **SQL Editor** in the left sidebar, paste this, and click Run:

```sql
create table if not exists jarvis_state (
  id text primary key,
  data text not null,
  updated_at timestamptz not null default now()
);

alter table jarvis_state enable row level security;

create policy "anon read"   on jarvis_state for select to anon using (true);
create policy "anon insert" on jarvis_state for insert to anon with check (true);
create policy "anon update" on jarvis_state for update to anon using (true) with check (true);
```

3. Go to **Settings → API** and copy two things:
   * **Project URL** (looks like `https://abcd1234.supabase.co`)
   * **anon public** key (long string starting with `eyJ`)

## Part 2: Deploy to chiletsgetfit.com (~5 min)

Optional but recommended first step: open `jarvis.html` in your editor, search for `SYNC_DEFAULTS`, and paste your Project URL and anon key into it:

```js
const SYNC_DEFAULTS = {
  url: 'https://abcd1234.supabase.co',
  anonKey: 'eyJhbGciOi...'
};
```

Baking these in means every device only needs the sync code. (The anon key is designed to be public, that's fine.)

Then, since your site is Next.js:

1. Drop `jarvis.html` into the **`public/`** folder of your repo. It will be served at `chiletsgetfit.com/jarvis.html`.
2. Optional, for the cleaner `/jarvis` URL, add a rewrite in `next.config.js`:

```js
async rewrites() {
  return [{ source: '/jarvis', destination: '/jarvis.html' }];
}
```

3. Commit and push. If the site auto-deploys (Vercel etc.), you're live a minute later.

One heads-up: the page itself is publicly reachable, but that's harmless. A visitor just sees an empty demo dashboard. Your actual data only appears on devices that have your sync code, and the server copy is encrypted.

## Part 3: Connect your devices (~2 min each)

On the iPad first:

1. Open `chiletsgetfit.com/jarvis` in Safari
2. CONFIG → SYNC tab. If you baked in the defaults, URL and key are pre-filled; otherwise paste them
3. Tap **GENERATE** to create a sync code, and save that code in your password manager. It is the key to your data; there is no "forgot code" recovery
4. Tap **ENABLE SYNC**. The header now shows a small SYNCED indicator
5. Share → **Add to Home Screen** for the full-screen app experience

On your phone and laptop: open the same URL, CONFIG → SYNC, enter the **same sync code**, ENABLE SYNC. Within a few seconds it loads your data. From then on, everything you log anywhere shows up everywhere (changes push within ~2 seconds, other devices pick them up on open, on returning to the app, and every 60 seconds while open).

## How syncing behaves

* Works offline: each device keeps a local copy and re-syncs when it's back online
* Last write wins: if you edit on two devices at the exact same moment, the most recent save is kept
* EXPORT BACKUP in the DATA tab still works and is a good habit, since it also protects you if you ever lose the sync code

## Later, if you want it

* Since this now lives on your coaching site, a natural evolution is a version your clients could use, tied into your existing sign-in portal. That's a bigger build (real accounts instead of sync codes), but this file is a solid prototype for it. Bring it back to Claude when you're ready.
* Same for new panels: water, sleep, habit streaks, client check-ins. One file, easy to grow.

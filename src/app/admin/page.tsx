export default function AdminHome() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Coach Dashboard
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Welcome, coach.
      </h1>
      <p className="mt-2 text-zinc-400">
        Build workouts, manage your client roster, and watch their progress.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <LinkCard
          href="/admin/clients"
          title="Clients"
          body="Invite clients, see who's active, deactivate ones who haven't paid."
        />
        <LinkCard
          href="/admin/exercises"
          title="Exercise library"
          body="Manage your exercise library — add cues, edit form notes, attach videos."
        />
        <LinkCard
          href="/admin/workouts"
          title="Workouts"
          body="Build a session from your exercise library, assign to a client and a date."
        />
        <PlaceholderCard
          title="Progress"
          body="See what your clients logged across this week and last."
        />
      </div>
    </div>
  );
}

import Link from "next/link";

function LinkCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-gold-400"
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-400">{body}</p>
      <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-gold-400 group-hover:text-gold-300">
        Open →
      </span>
    </Link>
  );
}

function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 opacity-60">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-400">{body}</p>
      <span className="mt-4 inline-block text-xs uppercase tracking-[0.25em] text-zinc-600">
        Coming soon
      </span>
    </div>
  );
}

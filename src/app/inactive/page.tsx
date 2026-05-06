import Link from "next/link";

export default function InactivePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-10 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-14 w-auto" />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your account is paused.
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Your coaching is currently inactive. Reach out to your coach to get
            back to training.
          </p>

          <a
            href="mailto:chiletsgetfit@gmail.com"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-8 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-gold-400"
          >
            Contact coach
          </a>

          <form action="/auth/signout" method="POST" className="mt-6">
            <button
              type="submit"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
            >
              Sign out
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            ← Back to chiletsgetfit.com
          </Link>
        </p>
      </div>
    </div>
  );
}

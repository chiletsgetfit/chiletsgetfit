import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your ChiletsGetFit account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/app" } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center" aria-label="ChiletsGetFit home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-14 w-auto" />
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to track your workouts and check progress.
          </p>

          <div className="mt-8">
            <LoginForm next={next} />
          </div>
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

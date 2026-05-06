import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/app");

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center" aria-label="ChiletsGetFit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-9 w-auto" />
            </Link>
            <span className="rounded-full border border-gold-700/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">
              Coach
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/app"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:text-gold-400"
            >
              Client view
            </Link>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:text-gold-400"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

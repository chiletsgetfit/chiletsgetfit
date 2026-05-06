import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active, password_set")
    .eq("id", user.id)
    .single();

  if (profile && !profile.active) redirect("/inactive");
  if (profile && !profile.password_set) redirect("/set-password");

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/app" className="flex items-center" aria-label="ChiletsGetFit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:text-gold-400"
              >
                Admin
              </Link>
            )}
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

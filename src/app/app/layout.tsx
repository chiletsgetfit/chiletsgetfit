import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./AppNav";

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

  // Studio members (supabase/14-studio.sql) get a link to /studio. Its own query,
  // run alongside, so a missing table can never break the client app.
  const [{ data: profile }, { data: studio }] = await Promise.all([
    supabase.from("profiles").select("full_name, role, active, password_set").eq("id", user.id).single(),
    supabase.from("studio_members").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profile && !profile.active) redirect("/inactive");
  if (profile && !profile.password_set) redirect("/set-password");

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/app" className="flex items-center" aria-label="ChiletsGetFit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-[72px] w-auto" />
          </Link>
          <AppNav isAdmin={isAdmin} hasStudio={!!studio} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

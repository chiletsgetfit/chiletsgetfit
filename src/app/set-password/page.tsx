import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("password_set, active")
    .eq("id", user.id)
    .single();

  if (profile && !profile.active) redirect("/inactive");
  if (profile?.password_set) redirect("/app");

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-14 w-auto" />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set your password.
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            One last step — choose a password and you&apos;re in.
          </p>

          <div className="mt-8">
            <SetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}

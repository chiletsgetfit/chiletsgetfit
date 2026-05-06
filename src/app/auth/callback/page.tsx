"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Capture URL fragment IMMEDIATELY, before supabase client may clear it.
    const initialHash =
      typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const hashParams = new URLSearchParams(initialHash);
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    const fragmentError =
      hashParams.get("error_description") ||
      hashParams.get("error_code") ||
      hashParams.get("error");

    const supabase = createClient();
    const next = searchParams.get("next") || "/app";
    const code = searchParams.get("code");

    async function handle() {
      // 1. PKCE flow: ?code= in query
      if (code) {
        // Sign out any existing session so the new one takes over cleanly.
        await supabase.auth.signOut({ scope: "local" });
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(
          code
        );
        if (exErr) {
          setError(exErr.message);
          return;
        }
        window.location.href = next;
        return;
      }

      // 2. Implicit flow: tokens in URL fragment
      if (access_token) {
        await supabase.auth.signOut({ scope: "local" });
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? "",
        });
        if (setErr) {
          setError(setErr.message);
          return;
        }
        window.location.href = next;
        return;
      }

      // 3. Auth provider returned an error
      if (fragmentError) {
        setError(decodeURIComponent(fragmentError.replace(/\+/g, " ")));
        return;
      }

      // 4. No auth data — fall through to existing session or login.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        window.location.href = next;
      } else {
        window.location.href = "/login";
      }
    }

    handle();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="max-w-md text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.svg"
            alt="ChiletsGetFit"
            className="mx-auto h-12 w-auto"
          />
          <h1 className="mt-8 text-xl font-semibold">Sign-in failed</h1>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <p className="mt-4 text-xs text-zinc-500">
            If this was an invite link, ask your coach to resend it.
          </p>
          <a
            href="/login"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-8 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-gold-400"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <p className="text-sm text-zinc-400">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <p className="text-sm text-zinc-400">Signing you in...</p>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

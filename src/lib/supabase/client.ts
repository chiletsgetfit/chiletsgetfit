import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Our /auth/callback page handles URL-fragment tokens manually so we
      // can read them BEFORE the client clears the URL, distinguish error
      // states, and replace any existing session cleanly.
      auth: { detectSessionInUrl: false },
    }
  );
}

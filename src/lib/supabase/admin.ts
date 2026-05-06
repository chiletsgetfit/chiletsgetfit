import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY Supabase client that uses the service_role key.
 * Bypasses RLS entirely. Use only in server actions / route handlers
 * for admin operations like inviting users.
 *
 * Never import this file from a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — set it in .env.local (and Vercel)."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

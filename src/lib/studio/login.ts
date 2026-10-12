import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SERVER-ONLY. Studio members can sign in with their first name ("amanda")
 * instead of their email. Resolves the name to the member's email, or null when
 * it doesn't match exactly one member -- the caller then answers with the same
 * error a wrong password gets, so names can't be probed.
 */
export async function studioEmailForUsername(username: string): Promise<string | null> {
  const name = username.trim().toLowerCase();
  if (!name || name.length > 60) return null;

  const admin = createAdminClient();
  const { data: members, error } = await admin.from("studio_members").select("user_id");
  if (error || !members?.length) return null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("full_name, email, active")
    .in(
      "id",
      members.map((m) => m.user_id)
    );

  const matches = (profiles ?? []).filter(
    (p) => p.active && p.email && (p.full_name ?? "").trim().split(/\s+/)[0].toLowerCase() === name
  );
  return matches.length === 1 ? (matches[0].email as string) : null;
}

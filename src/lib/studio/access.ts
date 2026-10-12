import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * SERVER-ONLY. The /studio gate, shared by the layout and the page: Next renders
 * them in parallel, so a redirect in the layout alone doesn't stop the page's
 * queries. cache() makes it one round of checks per request.
 */
export const requireStudio = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio");

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("full_name, active, password_set").eq("id", user.id).single(),
    supabase.from("studio_members").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profile && !profile.active) redirect("/inactive");
  if (profile && !profile.password_set) redirect("/set-password");
  // Members only (studio_members, managed by the coach). Anyone else lands on the app.
  if (!member) redirect("/app");

  return { supabase, user, fullName: (profile?.full_name as string | null) ?? "" };
});

/**
 * For /api/studio/* routes: the signed-in, active member, or a ready error reply.
 * Paid routes are same-origin only: Supabase's session cookies are SameSite=Lax,
 * so a link on another site could otherwise make a top-level GET that spends credit.
 */
export async function studioApiUser(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return { error: "Forbidden.", status: 403 } as const;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in to the studio.", status: 401 } as const;
  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("active").eq("id", user.id).single(),
    supabase.from("studio_members").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!member || (profile && !profile.active)) return { error: "The studio is for members only.", status: 403 } as const;
  return { supabase, user } as const;
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteState = { error?: string; success?: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Admins only");
  return user;
}

export async function inviteClient(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !fullName) {
    return { error: "Name and email are both required." };
  }

  try {
    await ensureAdmin();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Permission denied" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/set-password`,
    data: { full_name: fullName },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/clients");
  return { success: `Invite sent to ${email}.` };
}

export async function assignProgram(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  if (!clientId || !programId) {
    throw new Error("Client and program are required.");
  }

  await ensureAdmin();
  const supabase = await createClient();

  const { data: program, error: programErr } = await supabase
    .from("programs")
    .select("days_per_week")
    .eq("id", programId)
    .single();
  if (programErr || !program) throw new Error("Program not found.");

  // End any active assignment for this client.
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("client_programs")
    .update({ ended_at: today })
    .eq("client_id", clientId)
    .is("ended_at", null);

  const { error } = await supabase.from("client_programs").insert({
    client_id: clientId,
    program_id: programId,
    target_per_week: program.days_per_week,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
}

export async function unassignProgram(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) throw new Error("Client is required.");

  await ensureAdmin();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("client_programs")
    .update({ ended_at: today })
    .eq("client_id", clientId)
    .is("ended_at", null);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clients");
}

export async function toggleClientActive(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const nextActive = String(formData.get("active") ?? "") === "true";

  await ensureAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active: nextActive })
    .eq("id", clientId)
    .eq("role", "client");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/clients");
}

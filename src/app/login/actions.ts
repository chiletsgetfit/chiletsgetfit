"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { studioEmailForUsername } from "@/lib/studio/login";

export type AuthState = {
  error?: string;
};

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Only ever continue to a page on this site.
  const rawNext = String(formData.get("next") ?? "/app");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  if (!identifier || !password) {
    return { error: "Enter your email and password." };
  }

  // Studio members may use their first name instead of an email.
  let email = identifier;
  if (!identifier.includes("@")) {
    const resolved = await studioEmailForUsername(identifier);
    if (!resolved) return { error: "Invalid login credentials" };
    email = resolved;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

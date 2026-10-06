// Create or delete throwaway accounts for testing the app on localhost.
//
//   node scripts/test-accounts.mjs create   → a test client + a test coach (admin)
//   node scripts/test-accounts.mjs delete   → removes both (cascades their data)
//
// Credentials are written to scripts/test-accounts.local.json, which is
// gitignored. Never commit it and never paste its contents anywhere.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FILE = "scripts/test-accounts.local.json";
const ACCOUNTS = [
  { key: "client", email: "cgf.testclient@example.com", name: "Test Client", role: "client" },
  { key: "coach", email: "cgf.testcoach@example.com", name: "Test Coach", role: "admin" },
];
const cmd = process.argv[2];

if (cmd === "create") {
  if (existsSync(FILE)) {
    console.log(`Test accounts already exist (see ${FILE}). Run "delete" first to recreate.`);
    process.exit(0);
  }
  const out = {};
  for (const a of ACCOUNTS) {
    const password = randomBytes(12).toString("base64url");
    const { data, error } = await supabase.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: a.name },
    });
    if (error) {
      console.error(`createUser failed for ${a.email}: ${error.message}`);
      process.exit(1);
    }
    const id = data.user.id;
    // The auth trigger already inserted the profile row; make it ready to use.
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ role: a.role, active: true, password_set: true, full_name: a.name, email: a.email })
      .eq("id", id);
    if (pErr) {
      console.error(`profile update failed for ${a.email}: ${pErr.message}`);
      process.exit(1);
    }
    out[a.key] = { email: a.email, password, userId: id };
    console.log(`Created ${a.role} ${a.email} (${id})`);
  }
  writeFileSync(FILE, JSON.stringify(out, null, 2));
  console.log(`Credentials written to ${FILE}`);
} else if (cmd === "delete") {
  if (!existsSync(FILE)) {
    console.log("No test accounts file found; nothing to delete.");
    process.exit(0);
  }
  const saved = JSON.parse(readFileSync(FILE, "utf8"));
  for (const [key, acct] of Object.entries(saved)) {
    const { error } = await supabase.auth.admin.deleteUser(acct.userId);
    if (error) {
      console.error(`deleteUser failed for ${key}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Deleted ${key} ${acct.email}`);
  }
  unlinkSync(FILE);
  console.log(`Removed ${FILE}`);
} else {
  console.log("Usage: node scripts/test-accounts.mjs <create|delete>");
  process.exit(1);
}

// Set a client's password yourself (the password is typed here, never stored).
//
//   node scripts/set-password.mjs amanda
//
// Matches the account by first name or email, asks for the new password twice
// (hidden), and marks the account as having a password so /set-password is skipped.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import readline from "readline";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const who = (process.argv[2] ?? "").trim().toLowerCase();
if (!who) {
  console.log("Usage: node scripts/set-password.mjs <first name or email>");
  process.exit(1);
}

const { data: profiles, error } = await supabase.from("profiles").select("id, full_name, email");
if (error) {
  console.error(error.message);
  process.exit(1);
}
const matches = profiles.filter(
  (p) => (p.email ?? "").toLowerCase() === who || (p.full_name ?? "").trim().split(/\s+/)[0].toLowerCase() === who
);
if (matches.length !== 1) {
  console.error(matches.length ? `"${who}" matches ${matches.length} accounts — use the email instead.` : `No account matches "${who}".`);
  process.exit(1);
}
const target = matches[0];

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) rl.output.write(question);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const pw1 = await askHidden(`New password for ${target.full_name} (${target.email}): `);
const pw2 = await askHidden("Type it again: ");
if (pw1 !== pw2) {
  console.error("The two passwords don't match. Nothing changed.");
  process.exit(1);
}
if (pw1.length < 6) {
  console.error("Supabase needs at least 6 characters. Nothing changed.");
  process.exit(1);
}

const { error: upErr } = await supabase.auth.admin.updateUserById(target.id, { password: pw1 });
if (upErr) {
  console.error(`Couldn't set the password: ${upErr.message}`);
  process.exit(1);
}
await supabase.from("profiles").update({ password_set: true }).eq("id", target.id);
console.log(`Password set for ${target.full_name}.`);

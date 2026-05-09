// Populate exercises.demo_images from the free-exercise-db dataset
// (https://github.com/yuhonas/free-exercise-db). STRICT MATCHING:
//
// 1. Filter yuhonas candidates to those that share at least one muscle
//    group with the user's exercise (when known).
// 2. Match in tiers, picking the BEST tier:
//      Tier A: yuhonas tokens == user tokens (exact normalized name)
//      Tier B: user normalized name is a contiguous phrase inside yuhonas
//              (e.g. "Barbell Bench Press" ⊂ "Barbell Bench Press - Medium Grip")
//      Tier C: every user token appears in yuhonas tokens, AND yuhonas has
//              ≤1 extra non-trivial word (avoids "Decline Barbell Bench Press"
//              matching "Bench Press").
// 3. Among candidates within the chosen tier, pick the one with the FEWEST
//    extra tokens — favors closest fit.
//
// Pass --clear to overwrite all existing matches.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

const FORCE = process.argv.includes("--clear");

const REPO_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const muscleAliases = {
  Chest: ["chest", "pectorals"],
  Lats: ["lats", "latissimus"],
  "Upper Back": ["middle back", "rhomboids"],
  Traps: ["traps", "trapezius"],
  Shoulders: ["shoulders", "deltoids"],
  Biceps: ["biceps"],
  Triceps: ["triceps"],
  Forearms: ["forearms"],
  Quads: ["quadriceps", "quads"],
  Hamstrings: ["hamstrings"],
  Glutes: ["glutes"],
  Calves: ["calves"],
  Abs: ["abdominals", "abs"],
  "Lower Back": ["lower back"],
  "Full Body": ["full body"],
};

// Tokens that don't carry meaning we should ignore in size comparisons
// ("the", "a", etc.). Most fitness names don't have these but just in case.
const STOPWORDS = new Set(["the", "a", "of", "with", "on", "in"]);

function tokenize(name) {
  return name
    .toLowerCase()
    .replace(/[_\-()/.,]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

const json = await fetch(
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
).then((r) => r.json());

const yuhonas = json
  .filter((e) => Array.isArray(e.images) && e.images.length > 0)
  .map((e) => ({
    id: e.id,
    name: e.name,
    tokens: tokenize(e.name),
    primaryMuscles: (e.primaryMuscles ?? []).map((m) => m.toLowerCase()),
    secondaryMuscles: (e.secondaryMuscles ?? []).map((m) => m.toLowerCase()),
    images: e.images.map((p) => `${REPO_BASE}/${p}`),
  }));

console.log(`Yuhonas: ${yuhonas.length} exercises with images.`);

const { data: ours } = await supabase
  .from("exercises")
  .select("id, name, muscle_group, demo_images");
console.log(`Library: ${ours.length} exercises.`);

if (FORCE) {
  await supabase
    .from("exercises")
    .update({ demo_images: [] })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("Cleared all demo_images.");
}

let tierA = 0, tierB = 0, tierC = 0, none = 0;
const updates = [];
const log = [];

for (const ex of ours) {
  if (!FORCE && ex.demo_images && ex.demo_images.length >= 2) continue;

  const userTokens = tokenize(ex.name);
  const userJoined = userTokens.join(" ");
  const muscleHints = (muscleAliases[ex.muscle_group] ?? []).map((s) =>
    s.toLowerCase()
  );

  // Hard filter: must share a muscle group when one is set on our side.
  const candidates = muscleHints.length === 0
    ? yuhonas
    : yuhonas.filter((y) =>
        y.primaryMuscles.some((m) =>
          muscleHints.some((h) => m.includes(h) || h.includes(m))
        )
      );

  let pick = null;
  let tier = "none";

  // Tier A: exact normalized match.
  const a = candidates.filter((y) => y.tokens.join(" ") === userJoined);
  if (a.length > 0) {
    pick = a[0];
    tier = "A";
  }

  // Tier B: user phrase is contiguous substring of yuhonas phrase.
  if (!pick) {
    const b = candidates.filter((y) =>
      y.tokens.join(" ").includes(userJoined)
    );
    if (b.length > 0) {
      // Prefer the one with the fewest extra tokens.
      b.sort((x, y) => x.tokens.length - y.tokens.length);
      pick = b[0];
      tier = "B";
    }
  }

  // Tier C: every user token in yuhonas tokens, with ≤1 extra non-trivial word.
  if (!pick) {
    const c = candidates.filter((y) => {
      const allIn = userTokens.every((t) => y.tokens.includes(t));
      if (!allIn) return false;
      const extra = y.tokens.length - userTokens.length;
      return extra <= 1 && extra >= 0;
    });
    if (c.length > 0) {
      c.sort((x, y) => x.tokens.length - y.tokens.length);
      pick = c[0];
      tier = "C";
    }
  }

  if (pick) {
    if (tier === "A") tierA++;
    if (tier === "B") tierB++;
    if (tier === "C") tierC++;
    updates.push({ id: ex.id, demo_images: pick.images.slice(0, 2) });
    log.push(`[${tier}] ${ex.name}  ←  ${pick.name}`);
  } else {
    none++;
    log.push(`[ ] ${ex.name}  ←  (no match)`);
  }
}

console.log(`\nA (exact): ${tierA}`);
console.log(`B (substring): ${tierB}`);
console.log(`C (subset+1): ${tierC}`);
console.log(`Unmatched: ${none}`);
console.log(`Total matched: ${tierA + tierB + tierC} / ${ours.length}`);

const BATCH = 50;
for (let i = 0; i < updates.length; i += BATCH) {
  const slice = updates.slice(i, i + BATCH);
  await Promise.all(
    slice.map((u) =>
      supabase
        .from("exercises")
        .update({ demo_images: u.demo_images })
        .eq("id", u.id)
    )
  );
}
console.log(`Applied ${updates.length} updates.`);

console.log("\n--- Match log ---");
for (const l of log) console.log(l);

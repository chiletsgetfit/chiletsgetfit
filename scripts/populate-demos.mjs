// Populate exercises.demo_images from the free-exercise-db dataset
// (https://github.com/yuhonas/free-exercise-db). Run once; rerun if you
// add new exercises to the library.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

const REPO_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const muscleAliases = {
  Chest: ["chest", "pectorals"],
  Lats: ["lats", "latissimus"],
  "Upper Back": ["upper back", "middle back", "rhomboids", "traps"],
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

function tokenize(name) {
  return name
    .toLowerCase()
    .replace(/[_\-()/.,]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function score(userTokens, yuhTokens, sameMuscle) {
  const a = new Set(userTokens);
  const b = new Set(yuhTokens);
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  let s = union === 0 ? 0 : inter / union;
  // Bonus if the user name is a clean subset of the yuhonas name (e.g.
  // "Barbell Bench Press" ⊂ "Barbell Bench Press - Medium Grip").
  const userSubset = [...a].every((t) => b.has(t));
  if (userSubset && a.size > 0) s += 0.25;
  if (sameMuscle) s += 0.15;
  return s;
}

const json = await fetch(
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
).then((r) => r.json());
console.log(`Loaded ${json.length} exercises from yuhonas dataset.`);

const yuhonas = json
  .filter((e) => Array.isArray(e.images) && e.images.length > 0)
  .map((e) => ({
    id: e.id,
    name: e.name,
    tokens: tokenize(e.name),
    primaryMuscles: e.primaryMuscles ?? [],
    images: e.images.map((p) => `${REPO_BASE}/${p}`),
  }));
console.log(`${yuhonas.length} have images.`);

const { data: ours } = await supabase
  .from("exercises")
  .select("id, name, muscle_group, demo_images");
console.log(`We have ${ours.length} exercises in the library.`);

let matched = 0;
let skippedExisting = 0;
const unmatched = [];
const updates = [];

for (const ex of ours) {
  if (ex.demo_images && ex.demo_images.length >= 2) {
    skippedExisting++;
    continue;
  }
  const userTokens = tokenize(ex.name);
  const muscleHints = (muscleAliases[ex.muscle_group] ?? []).map((s) =>
    s.toLowerCase()
  );
  let best = null;
  let bestScore = 0;
  for (const y of yuhonas) {
    const sameMuscle =
      muscleHints.length > 0 &&
      y.primaryMuscles.some((m) =>
        muscleHints.some((h) => m.toLowerCase().includes(h))
      );
    const s = score(userTokens, y.tokens, sameMuscle);
    if (s > bestScore) {
      bestScore = s;
      best = y;
    }
  }
  if (best && bestScore >= 0.4) {
    matched++;
    updates.push({
      id: ex.id,
      demo_images: best.images.slice(0, 2),
      _name: ex.name,
      _matchedTo: best.name,
      _score: bestScore.toFixed(2),
    });
  } else {
    unmatched.push({ name: ex.name, bestGuess: best?.name, score: bestScore.toFixed(2) });
  }
}

console.log(`Matched: ${matched}`);
console.log(`Skipped (already had images): ${skippedExisting}`);
console.log(`Unmatched: ${unmatched.length}`);

// Apply updates in batches.
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

if (unmatched.length > 0) {
  console.log("\nUnmatched (first 30):");
  for (const u of unmatched.slice(0, 30)) {
    console.log(`  - ${u.name} (best guess: ${u.bestGuess}, score: ${u.score})`);
  }
}

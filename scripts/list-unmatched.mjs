import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);
const { data } = await supabase
  .from("exercises")
  .select("id, name, muscle_group, video_url")
  .or("demo_images.eq.{},demo_images.is.null")
  .order("muscle_group, name");
const unmatched = (data ?? []).filter(
  (e) => !e.demo_images || e.demo_images.length === 0
);
console.log(`${unmatched.length} exercises without demos`);
for (const e of unmatched) {
  console.log(`${e.muscle_group ?? "?"}\t${e.name}${e.video_url ? "\t[has video_url]" : ""}`);
}

// Apply curated YouTube demonstration URLs to exercises that don't have a
// demo yet. URLs were hand-picked from public channels (Jeff Nippard,
// Athlean-X, Squat University, Renaissance Periodization, etc.). Stored in
// the existing video_url column.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY")
);

// Maps exercise NAME (exact) -> public YouTube URL.
// Keep in alphabetical order within each muscle group section for readability.
const URLS = {
  // ===== ABS =====
  "Ab Wheel Rollout": "https://www.youtube.com/watch?v=j6lR4u193gE",
  "Bird Dog": "https://www.youtube.com/watch?v=ZdAHe9_HeEw",
  "Captain's Chair Knee Raise": "https://www.youtube.com/watch?v=9APysM090aI",
  "Dragon Flag": "https://www.youtube.com/watch?v=Q8OjRwJWPt8",
  "Hanging Knee Raise": "https://www.youtube.com/watch?v=p9hhX_Sx5v0",
  "Hollow Hold": "https://www.youtube.com/watch?v=HAfUt2Cco74",
  "L-Sit": "https://www.youtube.com/watch?v=z-gbvxX8fHg",
  "Mountain Climber": "https://www.youtube.com/watch?v=cnyTQDSE884",
  "Reverse Plank": "https://www.youtube.com/watch?v=T_OPGz218B4",
  "Side Plank": "https://www.youtube.com/watch?v=Ujf5ELfqI7o",
  "Toes-to-Bar": "https://www.youtube.com/watch?v=DVMrILiX_oc",
  "V-Up": "https://www.youtube.com/watch?v=DfVArP2V6kg",
  // ===== BICEPS =====
  "21s": "https://www.youtube.com/watch?v=oq7jXQP3Fk8",
  "Cable Curl (rope)": "https://www.youtube.com/watch?v=VY4walmoM-I",
  "Cable Curl (straight bar)": "https://www.youtube.com/watch?v=d7friQusjF8",
  "Cable Single-Arm Curl": "https://www.youtube.com/watch?v=njLoCel5lUI",
  "Preacher Curl (barbell)": "https://www.youtube.com/watch?v=jilTTmyEoYY",
  // ===== CALVES =====
  "Leg Press Calf Raise": "https://www.youtube.com/watch?v=8k435cj30gc",
  "Single-Leg Calf Raise": "https://www.youtube.com/watch?v=ElcvJ0kjt6c",
  "Tibialis Raise": "https://www.youtube.com/watch?v=pz70FwVRDJE",
  // ===== CHEST =====
  "Archer Push-Up": "https://www.youtube.com/watch?v=Ycbbf7_k7Rc",
  "Cable Crossover (high to low)": "https://www.youtube.com/watch?v=z5uWfxV0piE",
  "Cable Crossover (low to high)": "https://www.youtube.com/watch?v=Am8PfTpwiCY",
  "Cable Fly (mid)": "https://www.youtube.com/watch?v=4Y8QgiT2-OA",
  "Chest Dip": "https://www.youtube.com/watch?v=yN6Q1UI_xkE",
  "Close-Grip Bench Press": "https://www.youtube.com/watch?v=LB6HBNHkavg",
  "Diamond Push-Up": "https://www.youtube.com/watch?v=8_ILkbB9an8",
  "Incline Barbell Bench Press": "https://www.youtube.com/watch?v=SrqOu55lrYU",
  "Landmine Press": "https://www.youtube.com/watch?v=jCfcGei-NqM",
  "Larsen Press": "https://www.youtube.com/watch?v=8EzVDZWqAZE",
  "Machine Chest Press": "https://www.youtube.com/watch?v=4YpxZXFADmc",
  "Pec Deck": "https://www.youtube.com/watch?v=H4mVGHaK2f4",
  "Pin Bench Press": "https://www.youtube.com/watch?v=h1hQvDLFYt8",
  "Plyometric Push-Up": "https://www.youtube.com/watch?v=MH4gcTKQiEc",
  "Spoto Press": "https://www.youtube.com/watch?v=wgd4zSPmwZM",
  "Wide-Grip Push-Up": "https://www.youtube.com/watch?v=s7bslDs8Av8",
  // ===== FOREARMS =====
  "Dead Hang": "https://www.youtube.com/watch?v=PlAE67ovNEo",
  "Farmer Walk": "https://www.youtube.com/watch?v=Tgi5SNDbBZQ",
  "Reverse Wrist Curl": "https://www.youtube.com/watch?v=krZ6pWGZ8xo",
  // ===== FULL BODY =====
  "Assault Bike": "https://www.youtube.com/watch?v=Sg3Id7Lu8XU",
  "Battle Ropes": "https://www.youtube.com/watch?v=uyaANzMXQHY",
  "Burpee": "https://www.youtube.com/watch?v=auBLPXO8Fww",
  "Clean & Jerk": "https://www.youtube.com/watch?v=9HyWjAk7fhY",
  "Clean & Press": "https://www.youtube.com/watch?v=8h7giY-GWTs",
  "Hang Clean": "https://www.youtube.com/watch?v=uUeV3LwisDI",
  "Kettlebell Snatch": "https://www.youtube.com/watch?v=ZQccQg4kDf8",
  "Med Ball Chest Throw": "https://www.youtube.com/watch?v=ZlrvmNflFJw",
  "Med Ball Rotational Throw": "https://www.youtube.com/watch?v=DttZ5JU-b_U",
  "Med Ball Slam": "https://www.youtube.com/watch?v=QxYhFwMd1Ks",
  "Power Clean": "https://www.youtube.com/watch?v=YG8M_-11C2A",
  "Power Snatch": "https://www.youtube.com/watch?v=ydHHsju1-Nc",
  "Push Jerk": "https://www.youtube.com/watch?v=Om7vLD6x8W0",
  "Rowing Machine": "https://www.youtube.com/watch?v=4zWu1yuJ0_g",
  "Ski Erg": "https://www.youtube.com/watch?v=B0lIgT5PHc8",
  "Sled Pull": "https://www.youtube.com/watch?v=BSJIKV7h5po",
  "Sled Push": "https://www.youtube.com/watch?v=-sCBIaDGSC4",
  "Snatch": "https://www.youtube.com/watch?v=UQS6k0Gsyrw",
  "Split Jerk": "https://www.youtube.com/watch?v=2GPA-cjUFnA",
  "Thruster": "https://www.youtube.com/watch?v=z0PGxb8BSq8",
  "Turkish Get-Up": "https://www.youtube.com/watch?v=0bWRPC49-KI",
  // ===== GLUTES =====
  "Conventional Deadlift": "https://www.youtube.com/watch?v=VL5Ab0T07e4",
  "Sumo Deadlift": "https://www.youtube.com/watch?v=XsrD5y8EIKU",
  "Trap Bar Deadlift": "https://www.youtube.com/watch?v=HCFTFM8jIwg",
  "Snatch-Grip Deadlift": "https://www.youtube.com/watch?v=r5eT5DUfzww",
  "Banded Glute Kickback": "https://www.youtube.com/watch?v=jBmarLD4Nog",
  "Banded Lateral Walk": "https://www.youtube.com/watch?v=CNUzq8eSQSo",
  "Banded Monster Walk": "https://www.youtube.com/watch?v=hE4UsbLMjC8",
  "Block Pull / Rack Pull": "https://www.youtube.com/watch?v=ZR5t8K487dQ",
  "Cable Glute Kickback": "https://www.youtube.com/watch?v=5jJNfIlKTmg",
  "Cable Pull-Through": "https://www.youtube.com/watch?v=yXopOhzEoeo",
  "Deficit Deadlift": "https://www.youtube.com/watch?v=CpWsUsqBtN8",
  "Dumbbell Hip Thrust": "https://www.youtube.com/watch?v=29OfN4ztW_g",
  "Frog Pump": "https://www.youtube.com/watch?v=rgljhH1X4vc",
  "Hip Abduction Machine": "https://www.youtube.com/watch?v=h9BqUMqK-SY",
  "Hip Thrust Machine": "https://www.youtube.com/watch?v=tztHvSLdXLA",
  "Single-Leg Hip Thrust": "https://www.youtube.com/watch?v=L4nTaesNm0E",
  // ===== HAMSTRINGS =====
  "B-Stance Romanian Deadlift": "https://www.youtube.com/watch?v=ojacVMrnVSE",
  "Dumbbell Romanian Deadlift": "https://www.youtube.com/watch?v=aa57T45iFSE",
  "Nordic Curl": "https://www.youtube.com/watch?v=_e9vFU9-tkc",
  "Single-Leg Romanian Deadlift": "https://www.youtube.com/watch?v=J1ojvq3ftqM",
  "Stiff-Leg Deadlift": "https://www.youtube.com/watch?v=cO5omNU0wYI",
  // ===== LATS =====
  "Lat Pulldown (neutral)": "https://www.youtube.com/watch?v=4P3-TXbH4tw",
  "Neutral-Grip Pull-Up": "https://www.youtube.com/watch?v=cd_38C6LuvY",
  "Reverse-Grip Lat Pulldown": "https://www.youtube.com/watch?v=u1sCixw6lvA",
  "Single-Arm Lat Pulldown": "https://www.youtube.com/watch?v=qnwtbbj2ju0",
  // ===== LOWER BACK =====
  "45-Degree Back Extension": "https://www.youtube.com/watch?v=sRP1Q1L8pj4",
  "Jefferson Curl": "https://www.youtube.com/watch?v=_C9CdHrXmww",
  // ===== QUADS =====
  "Back Squat (high bar)": "https://www.youtube.com/watch?v=dW5-C1fsMjk",
  "Back Squat (low bar)": "https://www.youtube.com/watch?v=Po9CDtfcLJI",
  "Belt Squat": "https://www.youtube.com/watch?v=h_ok0J0y5j4",
  "Broad Jump": "https://www.youtube.com/watch?v=GR5JVcHHS_Q",
  "Bulgarian Split Squat": "https://www.youtube.com/watch?v=hiLF_pF3EJM",
  "Curtsy Lunge": "https://www.youtube.com/watch?v=g8mCJDtD2DQ",
  "Cyclist Squat": "https://www.youtube.com/watch?v=hAdDSDRIInk",
  "Forward Lunge": "https://www.youtube.com/watch?v=QE_hU8XX48I",
  "Front-Foot Elevated Split Squat": "https://www.youtube.com/watch?v=_SZCACPCz20",
  "Hack Squat (machine)": "https://www.youtube.com/watch?v=h8Jf1otG_Sw",
  "Heel-Elevated Squat": "https://www.youtube.com/watch?v=UvxTioyshwQ",
  "Jumping Lunge": "https://www.youtube.com/watch?v=y7Iug7eC0dk",
  "Lateral Lunge": "https://www.youtube.com/watch?v=gwWv7aPcD88",
  "Lateral Step-Up": "https://www.youtube.com/watch?v=Pk7ngkIQ6n0",
  "Pause Squat": "https://www.youtube.com/watch?v=nknf16JJTZo",
  "Pin Squat": "https://www.youtube.com/watch?v=NO9mkilY26g",
  "Reverse Lunge": "https://www.youtube.com/watch?v=u_zSfK5ZFU4",
  "Reverse Nordic": "https://www.youtube.com/watch?v=PvJDjcfZe1c",
  "Safety Bar Squat": "https://www.youtube.com/watch?v=CMn1Z9pzZAk",
  "Single-Leg Leg Press": "https://www.youtube.com/watch?v=3aYsOsBA7ZE",
  "Split Squat Jump": "https://www.youtube.com/watch?v=UOprVyBZOUA",
  "Tempo Squat": "https://www.youtube.com/watch?v=mmb618X9Ieg",
  "Tuck Jump": "https://www.youtube.com/watch?v=ZR6aFqdRi2Y",
  // ===== SHOULDERS =====
  "Bent-Over Lateral Raise": "https://www.youtube.com/watch?v=ttvfGg9d76c",
  "Landmine Lateral Raise": "https://www.youtube.com/watch?v=0dz_aMj46L0",
  "Leaning Cable Lateral Raise": "https://www.youtube.com/watch?v=oU78rBkB1sU",
  "Machine Lateral Raise": "https://www.youtube.com/watch?v=NNAs8jx_zJI",
  "Overhead Press": "https://www.youtube.com/watch?v=_RlRDWO2jfg",
  "Seated Dumbbell Shoulder Press": "https://www.youtube.com/watch?v=fjQdQNjqS1A",
  "Seated Overhead Press": "https://www.youtube.com/watch?v=a81SaIpjGlA",
  "Single-Arm Dumbbell Press": "https://www.youtube.com/watch?v=L9VlR9yq904",
  "Z Press": "https://www.youtube.com/watch?v=DkI_hV92ZKg",
  // ===== TRAPS =====
  "Cable Reverse Fly": "https://www.youtube.com/watch?v=CfLXDFh110w",
  "Dumbbell Reverse Fly": "https://www.youtube.com/watch?v=4Xr7bKE_fxE",
  "Face Pull": "https://www.youtube.com/watch?v=ljgqer1ZpXg",
  "Reverse Pec Deck": "https://www.youtube.com/watch?v=v0rJuhEa59c",
  "Smith Machine Shrug": "https://www.youtube.com/watch?v=LI3b05LUdpA",
  "Trap Bar Shrug": "https://www.youtube.com/watch?v=dAg1Kaevqj0",
  "Hang Snatch": "https://www.youtube.com/watch?v=xyR1jUXHTdk",
  // ===== TRICEPS =====
  "Overhead Tricep Extension (dumbbell)": "https://www.youtube.com/watch?v=DZgpCf5alfI",
  "Overhead Tricep Extension (rope)": "https://www.youtube.com/watch?v=GzmlxvSFE7A",
  "Single-Arm Overhead Extension": "https://www.youtube.com/watch?v=jTQWYdWLvys",
  "Skull Crusher (barbell)": "https://www.youtube.com/watch?v=ZiQK4ActI5Y",
  "Skull Crusher (dumbbell)": "https://www.youtube.com/watch?v=VP9Qp72zZ_c",
  "Skull Crusher (EZ bar)": "https://www.youtube.com/watch?v=jR7Y5YcugYc",
  "Tricep Dip (bench)": "https://www.youtube.com/watch?v=j_WpuVY3wbo",
  "Tricep Dip (parallel bars)": "https://www.youtube.com/watch?v=U7HeutDqS_w",
  "Tricep Kickback (cable)": "https://www.youtube.com/watch?v=Rmi70NbBv24",
  "Tricep Press (machine)": "https://www.youtube.com/watch?v=IoAP0xQtROk",
  "Tricep Pushdown (bar)": "https://www.youtube.com/watch?v=8JBHlaS7Dkk",
  "Tricep Pushdown (rope)": "https://www.youtube.com/watch?v=8CbJK7mmisE",
  // ===== UPPER BACK =====
  "Chest-Supported Dumbbell Row": "https://www.youtube.com/watch?v=vmX58YYK3-8",
  "Helms Row": "https://www.youtube.com/watch?v=UB-QRjxif8A",
  "Kroc Row": "https://www.youtube.com/watch?v=lL6fOrEPvQI",
  "Machine Row": "https://www.youtube.com/watch?v=FU6YQawma2Q",
  "Meadows Row": "https://www.youtube.com/watch?v=G-jU1aPVhnY",
  "Pendlay Row": "https://www.youtube.com/watch?v=h4nkoayPFWw",
  "Seal Row": "https://www.youtube.com/watch?v=49Hbk_5fhoI",
  "Seated Cable Row (wide grip)": "https://www.youtube.com/watch?v=SYZxuSSQ-hk",
  "Single-Arm Dumbbell Row": "https://www.youtube.com/watch?v=gfUg6qWohTk",
  "Smith Machine Row": "https://www.youtube.com/watch?v=XZV9IwluPjw",
  "Yates Row": "https://www.youtube.com/watch?v=0RyZHNgCiqQ",
  // ===== FOREARMS =====
  // ===== FULL BODY =====
  // ===== GLUTES =====
  // ===== HAMSTRINGS =====
  // ===== LATS =====
  // ===== LOWER BACK =====
  // ===== QUADS =====
  // ===== SHOULDERS =====
  // ===== TRAPS =====
  // ===== TRICEPS =====
  // ===== UPPER BACK =====
};

const { data: ours } = await supabase
  .from("exercises")
  .select("id, name, video_url");
const byName = new Map(ours.map((e) => [e.name, e]));

let applied = 0;
let missing = 0;
for (const [name, url] of Object.entries(URLS)) {
  const ex = byName.get(name);
  if (!ex) {
    console.log(`  ! No exercise named "${name}" in DB`);
    missing++;
    continue;
  }
  const { error } = await supabase
    .from("exercises")
    .update({ video_url: url })
    .eq("id", ex.id);
  if (error) {
    console.log(`  ! Failed for "${name}": ${error.message}`);
  } else {
    applied++;
  }
}
console.log(`\nApplied: ${applied}`);
console.log(`Mismatched names: ${missing}`);
console.log(`Curated: ${Object.keys(URLS).length}`);

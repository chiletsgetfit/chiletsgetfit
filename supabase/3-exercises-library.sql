-- Exercise library: schema additions + comprehensive seed.
-- Idempotent — safe to re-run.

-- ============================================================
-- 1. Schema additions
-- ============================================================
alter table public.exercises
  add column if not exists equipment text,
  add column if not exists category text,
  add column if not exists video_url text;

create index if not exists idx_exercises_muscle
  on public.exercises (muscle_group);
create index if not exists idx_exercises_name
  on public.exercises (lower(name));

-- ============================================================
-- 2. Seed (idempotent: only inserts rows whose name doesn't yet exist)
-- ============================================================
with seed (name, muscle_group, equipment, category, instructions) as (
  values
    -- ---- CHEST ----
    ('Barbell Bench Press', 'Chest', 'Barbell', 'compound', 'Lie on a flat bench, lower the bar to mid-chest with control, drive through the feet, and press to lockout.'),
    ('Incline Barbell Bench Press', 'Chest', 'Barbell', 'compound', 'Bench at 30 degrees. Lower the bar to upper chest and press up.'),
    ('Decline Barbell Bench Press', 'Chest', 'Barbell', 'compound', 'Bench at -15 to -30 degrees. Lower bar to lower chest and press up.'),
    ('Close-Grip Bench Press', 'Chest', 'Barbell', 'compound', 'Hands inside shoulder width. Tucks elbows. Targets triceps and inner chest.'),
    ('Floor Press', 'Chest', 'Barbell', 'compound', 'Press from the floor with elbows touching at the bottom. Limits ROM to build lockout.'),
    ('Spoto Press', 'Chest', 'Barbell', 'compound', 'Bench press with a 1-2 second pause an inch above the chest.'),
    ('Pin Bench Press', 'Chest', 'Barbell', 'compound', 'Bench press from pins set just above the chest. Builds power off chest.'),
    ('Larsen Press', 'Chest', 'Barbell', 'compound', 'Bench press with feet up off the floor. Removes leg drive.'),
    ('Dumbbell Bench Press', 'Chest', 'Dumbbell', 'compound', 'Press dumbbells from chest level. Allows greater range of motion than barbell.'),
    ('Incline Dumbbell Press', 'Chest', 'Dumbbell', 'compound', 'Bench at 30 degrees. Press dumbbells from upper-chest level.'),
    ('Decline Dumbbell Press', 'Chest', 'Dumbbell', 'compound', 'Bench at -15 degrees. Press dumbbells from lower-chest level.'),
    ('Neutral-Grip Dumbbell Press', 'Chest', 'Dumbbell', 'compound', 'Press dumbbells with palms facing each other. Easier on the shoulders.'),
    ('Dumbbell Fly', 'Chest', 'Dumbbell', 'isolation', 'Flat bench. Sweep arms out and back with a slight elbow bend.'),
    ('Incline Dumbbell Fly', 'Chest', 'Dumbbell', 'isolation', 'On incline bench. Sweep arms out and back.'),
    ('Cable Crossover (high to low)', 'Chest', 'Cable', 'isolation', 'High pulleys. Bring handles down and across the body.'),
    ('Cable Crossover (low to high)', 'Chest', 'Cable', 'isolation', 'Low pulleys. Bring handles up and across the body.'),
    ('Cable Fly (mid)', 'Chest', 'Cable', 'isolation', 'Mid pulleys. Bring handles together in front at chest height.'),
    ('Pec Deck', 'Chest', 'Machine', 'isolation', 'Seated. Bring pads together in front of the chest with control.'),
    ('Machine Chest Press', 'Chest', 'Machine', 'compound', 'Seated. Press handles forward to lockout.'),
    ('Smith Machine Bench Press', 'Chest', 'Smith Machine', 'compound', 'Bar travels in fixed plane. Bench press as normal.'),
    ('Push-Up', 'Chest', 'Bodyweight', 'compound', 'Hands shoulder-width. Lower chest to floor and press up.'),
    ('Wide-Grip Push-Up', 'Chest', 'Bodyweight', 'compound', 'Hands wider than shoulders. Emphasizes chest.'),
    ('Diamond Push-Up', 'Chest', 'Bodyweight', 'compound', 'Hands together forming a diamond. Emphasizes triceps.'),
    ('Decline Push-Up', 'Chest', 'Bodyweight', 'compound', 'Feet elevated. Emphasizes upper chest.'),
    ('Incline Push-Up', 'Chest', 'Bodyweight', 'compound', 'Hands elevated. Easier variation; emphasizes lower chest.'),
    ('Plyometric Push-Up', 'Chest', 'Bodyweight', 'plyometric', 'Push-up with hands leaving the ground at the top.'),
    ('Archer Push-Up', 'Chest', 'Bodyweight', 'compound', 'Hands wide; shift weight to one arm at a time.'),
    ('Chest Dip', 'Chest', 'Bodyweight', 'compound', 'Lean torso forward at parallel bars. Lower until shoulders below elbows.'),
    ('Landmine Press', 'Chest', 'Barbell', 'compound', 'One end of bar in landmine. Press up and forward at an angle.'),
    ('Svend Press', 'Chest', 'Plate', 'isolation', 'Press a plate forward from the chest, squeezing the chest hard.'),

    -- ---- UPPER BACK / LATS ----
    ('Pull-Up', 'Lats', 'Bodyweight', 'compound', 'Overhand grip. Pull chin over the bar and lower with control.'),
    ('Wide-Grip Pull-Up', 'Lats', 'Bodyweight', 'compound', 'Wider than shoulders. Targets outer lats.'),
    ('Chin-Up', 'Lats', 'Bodyweight', 'compound', 'Underhand grip. Targets lats and biceps.'),
    ('Neutral-Grip Pull-Up', 'Lats', 'Bodyweight', 'compound', 'Palms facing each other. Easier on shoulders.'),
    ('Weighted Pull-Up', 'Lats', 'Bodyweight', 'compound', 'Pull-up with a belt and added weight.'),
    ('Lat Pulldown (wide)', 'Lats', 'Cable', 'compound', 'Wide grip. Pull bar to upper chest with chest up.'),
    ('Lat Pulldown (close grip)', 'Lats', 'Cable', 'compound', 'Close neutral grip. Targets lower lats.'),
    ('Lat Pulldown (neutral)', 'Lats', 'Cable', 'compound', 'Neutral grip handle. Pull to chest.'),
    ('Reverse-Grip Lat Pulldown', 'Lats', 'Cable', 'compound', 'Underhand grip, shoulder width. Emphasizes lower lats and biceps.'),
    ('Single-Arm Lat Pulldown', 'Lats', 'Cable', 'isolation', 'One handle at a time. Focus on full lat stretch.'),
    ('Straight-Arm Pulldown', 'Lats', 'Cable', 'isolation', 'Straight arms. Pull bar from overhead down to thighs.'),
    ('Bent-Over Barbell Row', 'Upper Back', 'Barbell', 'compound', 'Hinge at hips. Pull bar to lower chest with elbows tucked.'),
    ('Pendlay Row', 'Upper Back', 'Barbell', 'compound', 'Bar starts on floor each rep. Explosive pull to lower chest.'),
    ('Yates Row', 'Upper Back', 'Barbell', 'compound', 'Underhand grip, slight torso lean. Pull to belly.'),
    ('T-Bar Row', 'Upper Back', 'Barbell', 'compound', 'Landmine or T-bar machine. Pull weight up to chest.'),
    ('Single-Arm Dumbbell Row', 'Upper Back', 'Dumbbell', 'compound', 'Knee and hand on bench. Pull dumbbell to hip with control.'),
    ('Chest-Supported Dumbbell Row', 'Upper Back', 'Dumbbell', 'compound', 'Lie face-down on incline bench. Row dumbbells.'),
    ('Seal Row', 'Upper Back', 'Barbell', 'compound', 'Lie face-down on tall bench. Row barbell.'),
    ('Seated Cable Row', 'Upper Back', 'Cable', 'compound', 'Sit upright. Pull handle to belly with elbows close.'),
    ('Seated Cable Row (wide grip)', 'Upper Back', 'Cable', 'compound', 'Wide bar. Pull to upper chest with elbows flared.'),
    ('Inverted Row', 'Upper Back', 'Bodyweight', 'compound', 'Bar at hip height. Hang under and row chest to bar.'),
    ('Meadows Row', 'Upper Back', 'Barbell', 'compound', 'Single-arm landmine row in staggered stance.'),
    ('Helms Row', 'Upper Back', 'Dumbbell', 'compound', 'Standing chest-supported row on a high incline.'),
    ('Kroc Row', 'Upper Back', 'Dumbbell', 'compound', 'Heavy single-arm row with controlled body english.'),
    ('Machine Row', 'Upper Back', 'Machine', 'compound', 'Plate-loaded row. Pull handles to lower chest.'),
    ('Smith Machine Row', 'Upper Back', 'Smith Machine', 'compound', 'Bent-over row with bar in fixed plane.'),
    ('Renegade Row', 'Upper Back', 'Dumbbell', 'compound', 'Plank position. Row one dumbbell at a time, alternating.'),

    -- ---- TRAPS ----
    ('Barbell Shrug', 'Traps', 'Barbell', 'isolation', 'Shrug shoulders straight up; pause at top.'),
    ('Dumbbell Shrug', 'Traps', 'Dumbbell', 'isolation', 'Dumbbells at sides. Shrug straight up.'),
    ('Trap Bar Shrug', 'Traps', 'Trap Bar', 'isolation', 'Hold trap bar at sides. Shrug up.'),
    ('Cable Shrug', 'Traps', 'Cable', 'isolation', 'Stand facing low pulley. Shrug straight up.'),
    ('Smith Machine Shrug', 'Traps', 'Smith Machine', 'isolation', 'Bar in fixed plane. Shrug up.'),
    ('Face Pull', 'Traps', 'Cable', 'isolation', 'Rope at eye height. Pull to face with elbows high, externally rotate.'),
    ('Y-Raise', 'Traps', 'Dumbbell', 'isolation', 'Bend at hips. Raise dumbbells overhead in Y position.'),
    ('Dumbbell Reverse Fly', 'Traps', 'Dumbbell', 'isolation', 'Bend at hips. Sweep dumbbells out to sides.'),
    ('Reverse Pec Deck', 'Traps', 'Machine', 'isolation', 'Sit facing the machine. Spread arms back.'),
    ('Cable Reverse Fly', 'Traps', 'Cable', 'isolation', 'Cross cables. Sweep arms out to sides at shoulder height.'),

    -- ---- SHOULDERS ----
    ('Overhead Press', 'Shoulders', 'Barbell', 'compound', 'Standing. Press bar from front rack to lockout overhead.'),
    ('Seated Overhead Press', 'Shoulders', 'Barbell', 'compound', 'Seated with back support. Press bar overhead.'),
    ('Push Press', 'Shoulders', 'Barbell', 'compound', 'Use leg dip and drive to assist the press.'),
    ('Behind-The-Neck Press', 'Shoulders', 'Barbell', 'compound', 'Press bar from upper back to overhead. Requires shoulder mobility.'),
    ('Z Press', 'Shoulders', 'Barbell', 'compound', 'Seated on floor with legs straight. Press overhead.'),
    ('Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'compound', 'Press dumbbells from shoulder level to lockout.'),
    ('Seated Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'compound', 'Seated with back support. Press dumbbells overhead.'),
    ('Arnold Press', 'Shoulders', 'Dumbbell', 'compound', 'Start palms facing you, rotate as you press.'),
    ('Single-Arm Dumbbell Press', 'Shoulders', 'Dumbbell', 'compound', 'Press one dumbbell at a time. Brace core.'),
    ('Machine Shoulder Press', 'Shoulders', 'Machine', 'compound', 'Seated. Press handles overhead.'),
    ('Smith Machine Shoulder Press', 'Shoulders', 'Smith Machine', 'compound', 'Seated or standing. Press bar overhead.'),
    ('Lateral Raise', 'Shoulders', 'Dumbbell', 'isolation', 'Slight elbow bend. Raise dumbbells to shoulder height.'),
    ('Cable Lateral Raise', 'Shoulders', 'Cable', 'isolation', 'Single arm. Pull cable up and out.'),
    ('Machine Lateral Raise', 'Shoulders', 'Machine', 'isolation', 'Seated. Raise pads out to sides.'),
    ('Leaning Cable Lateral Raise', 'Shoulders', 'Cable', 'isolation', 'Lean away from pulley. Raise to shoulder height.'),
    ('Front Raise (dumbbell)', 'Shoulders', 'Dumbbell', 'isolation', 'Raise dumbbells in front to shoulder height.'),
    ('Front Raise (plate)', 'Shoulders', 'Plate', 'isolation', 'Hold a plate with both hands. Raise to shoulder height.'),
    ('Cable Front Raise', 'Shoulders', 'Cable', 'isolation', 'Low pulley behind. Raise rope or handle in front.'),
    ('Bent-Over Lateral Raise', 'Shoulders', 'Dumbbell', 'isolation', 'Hinge at hips. Raise dumbbells out to sides for rear delts.'),
    ('Upright Row', 'Shoulders', 'Barbell', 'compound', 'Pull bar to chin with elbows high.'),
    ('Cuban Press', 'Shoulders', 'Dumbbell', 'compound', 'Upright row, externally rotate, then press overhead.'),
    ('Landmine Lateral Raise', 'Shoulders', 'Barbell', 'isolation', 'Single-arm raise with landmine end of barbell.'),

    -- ---- BICEPS ----
    ('Barbell Curl', 'Biceps', 'Barbell', 'isolation', 'Curl barbell from thighs to chest. Keep elbows pinned.'),
    ('EZ-Bar Curl', 'Biceps', 'EZ Bar', 'isolation', 'EZ bar reduces wrist strain. Curl with elbows pinned.'),
    ('Reverse Curl', 'Biceps', 'EZ Bar', 'isolation', 'Overhand grip. Targets brachialis and forearms.'),
    ('Dumbbell Curl', 'Biceps', 'Dumbbell', 'isolation', 'Curl dumbbells with full supination at top.'),
    ('Hammer Curl', 'Biceps', 'Dumbbell', 'isolation', 'Neutral grip throughout. Targets brachialis.'),
    ('Cross-Body Hammer Curl', 'Biceps', 'Dumbbell', 'isolation', 'Curl dumbbell across body to opposite shoulder.'),
    ('Incline Dumbbell Curl', 'Biceps', 'Dumbbell', 'isolation', 'Lie back on incline. Maximal stretch on long head.'),
    ('Concentration Curl', 'Biceps', 'Dumbbell', 'isolation', 'Seated, elbow on inner thigh. Curl one arm.'),
    ('Preacher Curl (barbell)', 'Biceps', 'Barbell', 'isolation', 'Arms over preacher pad. Curl bar with full extension.'),
    ('Preacher Curl (dumbbell)', 'Biceps', 'Dumbbell', 'isolation', 'Single-arm preacher curl.'),
    ('Spider Curl', 'Biceps', 'Dumbbell', 'isolation', 'Lie face-down on incline. Curl dumbbells.'),
    ('Cable Curl (straight bar)', 'Biceps', 'Cable', 'isolation', 'Low pulley. Curl with elbows pinned.'),
    ('Cable Curl (rope)', 'Biceps', 'Cable', 'isolation', 'Rope attachment for hammer curls.'),
    ('Cable Single-Arm Curl', 'Biceps', 'Cable', 'isolation', 'Use D-handle. Strict curl one arm at a time.'),
    ('Drag Curl', 'Biceps', 'Barbell', 'isolation', 'Pull bar up while keeping elbows back, dragging up the body.'),
    ('21s', 'Biceps', 'Barbell', 'isolation', '7 partial bottom + 7 partial top + 7 full reps.'),
    ('Zottman Curl', 'Biceps', 'Dumbbell', 'isolation', 'Curl up supinated, rotate to overhand, lower slowly.'),

    -- ---- TRICEPS ----
    ('Skull Crusher (barbell)', 'Triceps', 'Barbell', 'isolation', 'Lie on bench. Lower bar to forehead, extend back up.'),
    ('Skull Crusher (EZ bar)', 'Triceps', 'EZ Bar', 'isolation', 'EZ bar version, easier on wrists.'),
    ('Skull Crusher (dumbbell)', 'Triceps', 'Dumbbell', 'isolation', 'Two dumbbells. Lower to either side of head.'),
    ('JM Press', 'Triceps', 'Barbell', 'compound', 'Half skull-crusher / half close-grip bench. Lower to upper chest.'),
    ('Tate Press', 'Triceps', 'Dumbbell', 'isolation', 'Press dumbbells from chest with elbows flared, palms forward.'),
    ('Tricep Pushdown (rope)', 'Triceps', 'Cable', 'isolation', 'High pulley. Push rope down and apart at the bottom.'),
    ('Tricep Pushdown (bar)', 'Triceps', 'Cable', 'isolation', 'High pulley. Push bar down to lockout.'),
    ('Reverse-Grip Pushdown', 'Triceps', 'Cable', 'isolation', 'Underhand grip. Targets medial head.'),
    ('Overhead Tricep Extension (dumbbell)', 'Triceps', 'Dumbbell', 'isolation', 'Hold one dumbbell overhead. Lower behind head, extend.'),
    ('Overhead Tricep Extension (rope)', 'Triceps', 'Cable', 'isolation', 'Face away from low pulley. Extend rope overhead.'),
    ('Single-Arm Overhead Extension', 'Triceps', 'Dumbbell', 'isolation', 'One arm at a time. Full stretch.'),
    ('Tricep Dip (parallel bars)', 'Triceps', 'Bodyweight', 'compound', 'Vertical torso. Lower until elbows at 90 degrees.'),
    ('Tricep Dip (bench)', 'Triceps', 'Bodyweight', 'compound', 'Hands on bench behind you. Lower hips and press up.'),
    ('Tricep Kickback (dumbbell)', 'Triceps', 'Dumbbell', 'isolation', 'Hinge at hips. Extend arm back to lockout.'),
    ('Tricep Kickback (cable)', 'Triceps', 'Cable', 'isolation', 'Low pulley. Hinge and extend arm back.'),
    ('Diamond Push-Up', 'Triceps', 'Bodyweight', 'compound', 'Hands together forming a diamond. Press up and down.'),

    -- ---- FOREARMS / GRIP ----
    ('Barbell Wrist Curl', 'Forearms', 'Barbell', 'isolation', 'Forearms on bench. Curl wrists up.'),
    ('Reverse Wrist Curl', 'Forearms', 'Barbell', 'isolation', 'Overhand grip. Extend wrists up.'),
    ('Farmer Walk', 'Forearms', 'Dumbbell', 'compound', 'Hold heavy dumbbells/handles. Walk with tall posture.'),
    ('Dead Hang', 'Forearms', 'Bodyweight', 'isolation', 'Hang from bar with full grip. Builds grip endurance.'),
    ('Plate Pinch', 'Forearms', 'Plate', 'isolation', 'Pinch two plates together. Hold for time.'),
    ('Wrist Roller', 'Forearms', 'Other', 'isolation', 'Roll weight up and down on a stick.'),

    -- ---- QUADS ----
    ('Back Squat (high bar)', 'Quads', 'Barbell', 'compound', 'Bar on traps. Squat to depth with upright torso.'),
    ('Back Squat (low bar)', 'Quads', 'Barbell', 'compound', 'Bar on rear delts. More hip drive, slightly more forward lean.'),
    ('Front Squat', 'Quads', 'Barbell', 'compound', 'Bar on front rack. Upright torso, deep squat.'),
    ('Box Squat', 'Quads', 'Barbell', 'compound', 'Sit back to a box at depth, then drive up.'),
    ('Pause Squat', 'Quads', 'Barbell', 'compound', '1-3 second pause at the bottom of each rep.'),
    ('Tempo Squat', 'Quads', 'Barbell', 'compound', 'Slow eccentric (3-5 seconds) on the way down.'),
    ('Pin Squat', 'Quads', 'Barbell', 'compound', 'Squat down to pins set at depth, dead-stop, then drive up.'),
    ('Goblet Squat', 'Quads', 'Dumbbell', 'compound', 'Hold one dumbbell at chest. Squat to depth.'),
    ('Bulgarian Split Squat', 'Quads', 'Dumbbell', 'compound', 'Rear foot elevated. Lunge down on front leg.'),
    ('Front-Foot Elevated Split Squat', 'Quads', 'Dumbbell', 'compound', 'Front foot on plate. Quad-biased split squat.'),
    ('Forward Lunge', 'Quads', 'Dumbbell', 'compound', 'Step forward into lunge, drive back to start.'),
    ('Reverse Lunge', 'Quads', 'Dumbbell', 'compound', 'Step backward into lunge.'),
    ('Walking Lunge', 'Quads', 'Dumbbell', 'compound', 'Lunge forward continuously.'),
    ('Lateral Lunge', 'Quads', 'Dumbbell', 'compound', 'Step out to the side, sit hip back into one leg.'),
    ('Curtsy Lunge', 'Quads', 'Dumbbell', 'compound', 'Step one leg behind and across. Targets glutes.'),
    ('Step-Up', 'Quads', 'Dumbbell', 'compound', 'Step onto box with one leg. Drive through heel.'),
    ('Lateral Step-Up', 'Quads', 'Dumbbell', 'compound', 'Step up onto box from the side.'),
    ('Hack Squat (machine)', 'Quads', 'Machine', 'compound', 'Back against pad. Squat to depth.'),
    ('Hack Squat (barbell)', 'Quads', 'Barbell', 'compound', 'Bar behind heels. Deadlift-style squat.'),
    ('Leg Press', 'Quads', 'Machine', 'compound', 'Feet shoulder width on platform. Lower under control.'),
    ('Single-Leg Leg Press', 'Quads', 'Machine', 'compound', 'One leg at a time on platform.'),
    ('Sissy Squat', 'Quads', 'Bodyweight', 'isolation', 'Lean back, knees forward over toes.'),
    ('Smith Machine Squat', 'Quads', 'Smith Machine', 'compound', 'Bar in fixed plane. Squat to depth.'),
    ('Heel-Elevated Squat', 'Quads', 'Barbell', 'compound', 'Heels on plate. Quad-biased squat.'),
    ('Cyclist Squat', 'Quads', 'Barbell', 'compound', 'Heels on plate, narrow stance. Maximal quad emphasis.'),
    ('Belt Squat', 'Quads', 'Machine', 'compound', 'Belt around waist holds load. Squat without spinal loading.'),
    ('Zercher Squat', 'Quads', 'Barbell', 'compound', 'Bar in crook of elbows. Squat upright.'),
    ('Safety Bar Squat', 'Quads', 'Barbell', 'compound', 'SSB on shoulders. Easier on shoulders than back squat.'),
    ('Pistol Squat', 'Quads', 'Bodyweight', 'compound', 'Single-leg squat with other leg straight in front.'),
    ('Leg Extension', 'Quads', 'Machine', 'isolation', 'Seated. Extend knees against pad.'),
    ('Single-Leg Leg Extension', 'Quads', 'Machine', 'isolation', 'One leg at a time.'),
    ('Reverse Nordic', 'Quads', 'Bodyweight', 'isolation', 'Kneeling, lean back. Stretches and loads quads.'),

    -- ---- HAMSTRINGS ----
    ('Romanian Deadlift', 'Hamstrings', 'Barbell', 'compound', 'Hinge at hips with slight knee bend. Lower bar to mid-shin.'),
    ('Dumbbell Romanian Deadlift', 'Hamstrings', 'Dumbbell', 'compound', 'Hinge at hips with dumbbells. Knees soft.'),
    ('Stiff-Leg Deadlift', 'Hamstrings', 'Barbell', 'compound', 'Knees nearly locked. Maximal hamstring stretch.'),
    ('Single-Leg Romanian Deadlift', 'Hamstrings', 'Dumbbell', 'compound', 'One leg planted; opposite leg extends back as you hinge.'),
    ('B-Stance Romanian Deadlift', 'Hamstrings', 'Dumbbell', 'compound', 'Kickstand stance. ~70% load on front leg.'),
    ('Good Morning', 'Hamstrings', 'Barbell', 'compound', 'Bar on back. Hinge with slight knee bend.'),
    ('Lying Leg Curl', 'Hamstrings', 'Machine', 'isolation', 'Lie face down. Curl heels to glutes.'),
    ('Seated Leg Curl', 'Hamstrings', 'Machine', 'isolation', 'Seated. Curl pad down and back.'),
    ('Standing Leg Curl', 'Hamstrings', 'Machine', 'isolation', 'One leg at a time. Curl heel to glute.'),
    ('Glute-Ham Raise', 'Hamstrings', 'Bodyweight', 'compound', 'On GHD. Hinge knees to lower torso, curl back up.'),
    ('Nordic Curl', 'Hamstrings', 'Bodyweight', 'compound', 'Knees down, feet anchored. Lower torso forward.'),
    ('Reverse Hyperextension', 'Hamstrings', 'Machine', 'compound', 'Hinge over machine. Raise legs to horizontal.'),
    ('Kettlebell Swing', 'Hamstrings', 'Kettlebell', 'compound', 'Hinge and snap hips to swing kettlebell to shoulder height.'),

    -- ---- GLUTES ----
    ('Barbell Hip Thrust', 'Glutes', 'Barbell', 'compound', 'Upper back on bench. Drive hips up to lockout.'),
    ('Dumbbell Hip Thrust', 'Glutes', 'Dumbbell', 'compound', 'Dumbbell on hips. Drive up.'),
    ('Single-Leg Hip Thrust', 'Glutes', 'Bodyweight', 'compound', 'One leg up, drive through other heel.'),
    ('Hip Thrust Machine', 'Glutes', 'Machine', 'compound', 'Plate-loaded hip thrust machine.'),
    ('Glute Bridge', 'Glutes', 'Bodyweight', 'compound', 'On floor. Drive hips up.'),
    ('Cable Pull-Through', 'Glutes', 'Cable', 'compound', 'Face away from low pulley. Hinge and stand.'),
    ('Cable Glute Kickback', 'Glutes', 'Cable', 'isolation', 'Ankle strap. Kick leg back against cable.'),
    ('Banded Glute Kickback', 'Glutes', 'Band', 'isolation', 'Loop band around ankles. Kick back.'),
    ('Frog Pump', 'Glutes', 'Bodyweight', 'isolation', 'Soles together, knees out. Bridge up.'),
    ('Conventional Deadlift', 'Glutes', 'Barbell', 'compound', 'Mixed grip. Pull bar from floor to lockout.'),
    ('Sumo Deadlift', 'Glutes', 'Barbell', 'compound', 'Wide stance. Hands inside knees. More glute and quad emphasis.'),
    ('Trap Bar Deadlift', 'Glutes', 'Trap Bar', 'compound', 'Stand inside trap bar handles. Squat-deadlift hybrid.'),
    ('Deficit Deadlift', 'Glutes', 'Barbell', 'compound', 'Stand on plate. Increases ROM.'),
    ('Block Pull / Rack Pull', 'Glutes', 'Barbell', 'compound', 'Bar elevated on blocks or pins above knees.'),
    ('Snatch-Grip Deadlift', 'Glutes', 'Barbell', 'compound', 'Wide grip. More upper-back and hamstring emphasis.'),
    ('Hip Abduction Machine', 'Glutes', 'Machine', 'isolation', 'Seated. Push knees out against pads.'),
    ('Banded Lateral Walk', 'Glutes', 'Band', 'isolation', 'Band around knees or ankles. Sidestep with tension.'),
    ('Banded Monster Walk', 'Glutes', 'Band', 'isolation', 'Band around ankles. Step forward in athletic stance.'),

    -- ---- CALVES ----
    ('Standing Calf Raise', 'Calves', 'Machine', 'isolation', 'Pad on shoulders. Rise onto toes.'),
    ('Seated Calf Raise', 'Calves', 'Machine', 'isolation', 'Pads on knees. Rise onto toes — soleus emphasis.'),
    ('Donkey Calf Raise', 'Calves', 'Machine', 'isolation', 'Bent at hips. Rise onto toes.'),
    ('Smith Machine Calf Raise', 'Calves', 'Smith Machine', 'isolation', 'Bar on shoulders, balls of feet on plate.'),
    ('Single-Leg Calf Raise', 'Calves', 'Dumbbell', 'isolation', 'Hold dumbbell on working side. One leg.'),
    ('Leg Press Calf Raise', 'Calves', 'Machine', 'isolation', 'Press platform with balls of feet only.'),
    ('Tibialis Raise', 'Calves', 'Bodyweight', 'isolation', 'Heels down, lift toes. Targets shin/tib anterior.'),

    -- ---- ABS / CORE ----
    ('Crunch', 'Abs', 'Bodyweight', 'core', 'Lie on back. Curl shoulders off ground.'),
    ('Decline Crunch', 'Abs', 'Bodyweight', 'core', 'On decline bench. Greater range than flat crunch.'),
    ('Sit-Up', 'Abs', 'Bodyweight', 'core', 'Curl all the way up to torso vertical.'),
    ('Hanging Leg Raise', 'Abs', 'Bodyweight', 'core', 'Hang from bar. Raise straight legs to horizontal or higher.'),
    ('Hanging Knee Raise', 'Abs', 'Bodyweight', 'core', 'Easier version. Raise knees to chest.'),
    ('Captain''s Chair Knee Raise', 'Abs', 'Machine', 'core', 'Forearms on pads. Raise knees.'),
    ('Cable Crunch', 'Abs', 'Cable', 'core', 'Kneeling, rope behind head. Crunch down toward thighs.'),
    ('Ab Wheel Rollout', 'Abs', 'Other', 'core', 'Roll wheel out as far as you can while keeping a flat back.'),
    ('Plank', 'Abs', 'Bodyweight', 'core', 'Hold a rigid line from heels to head on forearms.'),
    ('Side Plank', 'Abs', 'Bodyweight', 'core', 'Body in straight line, weight on one forearm.'),
    ('Reverse Plank', 'Abs', 'Bodyweight', 'core', 'Face up, palms down. Hips up.'),
    ('Russian Twist', 'Abs', 'Bodyweight', 'core', 'Seated, lean back. Twist torso side to side.'),
    ('Pallof Press', 'Abs', 'Cable', 'core', 'Anti-rotation. Press cable straight out from chest, hold.'),
    ('Dead Bug', 'Abs', 'Bodyweight', 'core', 'On back. Extend opposite arm and leg without flat back leaving the ground.'),
    ('Bird Dog', 'Abs', 'Bodyweight', 'core', 'On hands and knees. Extend opposite arm and leg.'),
    ('V-Up', 'Abs', 'Bodyweight', 'core', 'Lying. Bring hands and feet to meet over body.'),
    ('Hollow Hold', 'Abs', 'Bodyweight', 'core', 'Lower back pressed into floor. Lift legs and shoulders, hold.'),
    ('Mountain Climber', 'Abs', 'Bodyweight', 'core', 'Plank position. Drive knees alternately to chest.'),
    ('Toes-to-Bar', 'Abs', 'Bodyweight', 'core', 'Hang from bar. Bring toes to touch bar.'),
    ('L-Sit', 'Abs', 'Bodyweight', 'core', 'Support on parallettes/bars. Hold legs parallel to floor.'),
    ('Dragon Flag', 'Abs', 'Bodyweight', 'core', 'Lie on bench. Lift body to vertical, lower with control.'),
    ('Weighted Crunch', 'Abs', 'Plate', 'core', 'Hold plate on chest while crunching.'),

    -- ---- LOWER BACK ----
    ('Hyperextension', 'Lower Back', 'Bodyweight', 'isolation', 'Hips on pad. Hinge down and extend up.'),
    ('Weighted Hyperextension', 'Lower Back', 'Plate', 'isolation', 'Hold plate to chest while extending.'),
    ('45-Degree Back Extension', 'Lower Back', 'Bodyweight', 'isolation', 'On 45-degree bench. Hinge and extend.'),
    ('Superman', 'Lower Back', 'Bodyweight', 'isolation', 'Lie face down. Lift arms and legs simultaneously.'),
    ('Jefferson Curl', 'Lower Back', 'Dumbbell', 'isolation', 'Round spine and roll down to floor under control.'),

    -- ---- OLYMPIC / POWER ----
    ('Power Clean', 'Full Body', 'Barbell', 'olympic', 'Pull bar from floor, catch in front rack at quarter squat.'),
    ('Hang Clean', 'Full Body', 'Barbell', 'olympic', 'Start with bar at hip. Triple extend, catch in front rack.'),
    ('Clean & Jerk', 'Full Body', 'Barbell', 'olympic', 'Clean to front rack, then jerk overhead.'),
    ('Power Snatch', 'Full Body', 'Barbell', 'olympic', 'Wide grip. Pull bar overhead in one motion, catch in quarter squat.'),
    ('Hang Snatch', 'Full Body', 'Barbell', 'olympic', 'Start with bar at hip. Snatch overhead.'),
    ('Snatch', 'Full Body', 'Barbell', 'olympic', 'Full snatch from floor with deep overhead squat catch.'),
    ('Push Jerk', 'Full Body', 'Barbell', 'olympic', 'Dip and drive bar overhead, catch in quarter squat.'),
    ('Split Jerk', 'Full Body', 'Barbell', 'olympic', 'Jerk and catch with split stance.'),
    ('Thruster', 'Full Body', 'Barbell', 'compound', 'Front squat into push press in one motion.'),
    ('Clean & Press', 'Full Body', 'Barbell', 'compound', 'Clean to front rack, strict press overhead.'),
    ('Turkish Get-Up', 'Full Body', 'Kettlebell', 'compound', 'Lying to standing while holding weight overhead.'),
    ('Kettlebell Snatch', 'Full Body', 'Kettlebell', 'olympic', 'Single-arm swing snatched to lockout overhead.'),
    ('Burpee', 'Full Body', 'Bodyweight', 'conditioning', 'Squat, kick out to plank, push-up, jump up.'),

    -- ---- CONDITIONING / EXPLOSIVE ----
    ('Sled Push', 'Full Body', 'Sled', 'conditioning', 'Push sled with low body angle.'),
    ('Sled Pull', 'Full Body', 'Sled', 'conditioning', 'Walk backward pulling sled by handles or rope.'),
    ('Box Jump', 'Quads', 'Bodyweight', 'plyometric', 'Jump onto box from standing. Step down between reps.'),
    ('Broad Jump', 'Quads', 'Bodyweight', 'plyometric', 'Jump forward as far as possible from standing.'),
    ('Tuck Jump', 'Quads', 'Bodyweight', 'plyometric', 'Jump up bringing knees to chest.'),
    ('Split Squat Jump', 'Quads', 'Bodyweight', 'plyometric', 'Lunge stance. Jump and switch legs in air.'),
    ('Jumping Lunge', 'Quads', 'Bodyweight', 'plyometric', 'Alternating lunge with explosive switch.'),
    ('Med Ball Slam', 'Full Body', 'Other', 'conditioning', 'Raise overhead, slam down explosively.'),
    ('Med Ball Chest Throw', 'Full Body', 'Other', 'conditioning', 'Push throw med ball into wall from chest.'),
    ('Med Ball Rotational Throw', 'Full Body', 'Other', 'conditioning', 'Rotate hips and throw med ball into wall.'),
    ('Battle Ropes', 'Full Body', 'Other', 'conditioning', 'Alternate or simultaneous rope waves.'),
    ('Assault Bike', 'Full Body', 'Machine', 'conditioning', 'Push and pull arms while pedaling.'),
    ('Rowing Machine', 'Full Body', 'Machine', 'conditioning', 'Drive with legs, then back, then arms.'),
    ('Ski Erg', 'Full Body', 'Machine', 'conditioning', 'Pull handles down past hips with full hip hinge.')
)
insert into public.exercises (name, muscle_group, equipment, category, instructions)
select s.name, s.muscle_group, s.equipment, s.category, s.instructions
from seed s
where not exists (
  select 1 from public.exercises e where lower(e.name) = lower(s.name)
);

-- ============================================================
-- 3. Confirm
-- ============================================================
select muscle_group, count(*) as count
from public.exercises
group by muscle_group
order by count desc;

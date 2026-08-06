/**
 * Strength-progress helpers built from completed workouts + set_logs.
 */

export type LoggedSet = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  workoutId: string;
  completedAt: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
};

export type ExercisePr = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  bestWeight: number;
  bestWeightReps: number | null;
  bestWeightDate: string;
  bestSetVolume: number;
  bestSetVolumeLabel: string;
  bestSetVolumeDate: string;
  sessions: number;
};

export type ExerciseSession = {
  workoutId: string;
  completedAt: string;
  sets: { setNumber: number; weight: number | null; reps: number | null }[];
  bestWeight: number;
  totalVolume: number;
};

export type WeekStats = {
  sessions: number;
  sets: number;
  volume: number;
  start: Date;
  end: Date;
};

export type Mover = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  recentBest: number;
  priorBest: number;
  delta: number;
  deltaPct: number;
};

export function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function setVolume(weight: number | null, reps: number | null) {
  if (weight == null || reps == null) return 0;
  return weight * reps;
}

export function formatVolume(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

type RawRow = {
  set_number: number;
  reps: number | null;
  weight: number | null;
  workout_exercises:
    | {
        exercise_id: string;
        workout_id: string;
        exercises:
          | { id: string; name: string; muscle_group: string | null }
          | { id: string; name: string; muscle_group: string | null }[]
          | null;
        workouts:
          | { id: string; client_id: string; completed_at: string | null }
          | { id: string; client_id: string; completed_at: string | null }[]
          | null;
      }
    | {
        exercise_id: string;
        workout_id: string;
        exercises:
          | { id: string; name: string; muscle_group: string | null }
          | { id: string; name: string; muscle_group: string | null }[]
          | null;
        workouts:
          | { id: string; client_id: string; completed_at: string | null }
          | { id: string; client_id: string; completed_at: string | null }[]
          | null;
      }[]
    | null;
};

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function flattenSetLogs(rows: RawRow[] | null | undefined): LoggedSet[] {
  const out: LoggedSet[] = [];
  for (const row of rows ?? []) {
    const we = one(row.workout_exercises);
    if (!we) continue;
    const w = one(we.workouts);
    const ex = one(we.exercises);
    if (!w?.completed_at || !ex?.id) continue;
    out.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.muscle_group,
      workoutId: w.id,
      completedAt: w.completed_at,
      setNumber: row.set_number,
      reps: row.reps,
      weight: row.weight,
    });
  }
  return out;
}

export function weekStats(logs: LoggedSet[], weekStart: Date): WeekStats {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  const startIso = weekStart.toISOString();
  const endIso = end.toISOString();
  const inWeek = logs.filter(
    (l) => l.completedAt >= startIso && l.completedAt < endIso,
  );
  const sessions = new Set(inWeek.map((l) => l.workoutId)).size;
  let volume = 0;
  for (const l of inWeek) volume += setVolume(l.weight, l.reps);
  return {
    sessions,
    sets: inWeek.length,
    volume,
    start: weekStart,
    end,
  };
}

export function computePrs(logs: LoggedSet[]): ExercisePr[] {
  const byEx = new Map<string, LoggedSet[]>();
  for (const l of logs) {
    const arr = byEx.get(l.exerciseId) ?? [];
    arr.push(l);
    byEx.set(l.exerciseId, arr);
  }

  const prs: ExercisePr[] = [];
  for (const [exerciseId, sets] of byEx) {
    let bestWeight = -1;
    let bestWeightReps: number | null = null;
    let bestWeightDate = "";
    let bestSetVolume = -1;
    let bestSetVolumeLabel = "";
    let bestSetVolumeDate = "";
    const sessions = new Set(sets.map((s) => s.workoutId));

    for (const s of sets) {
      if (s.weight != null && s.weight > bestWeight) {
        bestWeight = s.weight;
        bestWeightReps = s.reps;
        bestWeightDate = s.completedAt;
      }
      const vol = setVolume(s.weight, s.reps);
      if (vol > bestSetVolume) {
        bestSetVolume = vol;
        bestSetVolumeLabel =
          s.weight != null && s.reps != null
            ? `${s.weight} × ${s.reps}`
            : "—";
        bestSetVolumeDate = s.completedAt;
      }
    }

    if (bestWeight < 0 && bestSetVolume < 0) continue;
    prs.push({
      exerciseId,
      exerciseName: sets[0].exerciseName,
      muscleGroup: sets[0].muscleGroup,
      bestWeight: Math.max(0, bestWeight),
      bestWeightReps,
      bestWeightDate,
      bestSetVolume: Math.max(0, bestSetVolume),
      bestSetVolumeLabel,
      bestSetVolumeDate,
      sessions: sessions.size,
    });
  }

  return prs.sort((a, b) => b.bestWeight - a.bestWeight || a.exerciseName.localeCompare(b.exerciseName));
}

export function topMovers(logs: LoggedSet[], now = new Date()): Mover[] {
  const recentStart = new Date(now);
  recentStart.setDate(recentStart.getDate() - 28);
  const priorStart = new Date(now);
  priorStart.setDate(priorStart.getDate() - 56);
  const recentIso = recentStart.toISOString();
  const priorIso = priorStart.toISOString();

  const byEx = new Map<string, LoggedSet[]>();
  for (const l of logs) {
    const arr = byEx.get(l.exerciseId) ?? [];
    arr.push(l);
    byEx.set(l.exerciseId, arr);
  }

  const movers: Mover[] = [];
  for (const [exerciseId, sets] of byEx) {
    let recentBest = 0;
    let priorBest = 0;
    for (const s of sets) {
      if (s.weight == null) continue;
      if (s.completedAt >= recentIso) recentBest = Math.max(recentBest, s.weight);
      else if (s.completedAt >= priorIso) priorBest = Math.max(priorBest, s.weight);
    }
    if (recentBest <= 0 || priorBest <= 0) continue;
    const delta = recentBest - priorBest;
    if (delta === 0) continue;
    movers.push({
      exerciseId,
      exerciseName: sets[0].exerciseName,
      muscleGroup: sets[0].muscleGroup,
      recentBest,
      priorBest,
      delta,
      deltaPct: (delta / priorBest) * 100,
    });
  }

  return movers.sort((a, b) => b.deltaPct - a.deltaPct);
}

export function sessionsForExercise(
  logs: LoggedSet[],
  exerciseId: string,
): ExerciseSession[] {
  const sets = logs.filter((l) => l.exerciseId === exerciseId);
  const byWorkout = new Map<string, ExerciseSession>();
  for (const s of sets) {
    let entry = byWorkout.get(s.workoutId);
    if (!entry) {
      entry = {
        workoutId: s.workoutId,
        completedAt: s.completedAt,
        sets: [],
        bestWeight: 0,
        totalVolume: 0,
      };
      byWorkout.set(s.workoutId, entry);
    }
    entry.sets.push({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
    });
    if (s.weight != null) entry.bestWeight = Math.max(entry.bestWeight, s.weight);
    entry.totalVolume += setVolume(s.weight, s.reps);
  }
  return [...byWorkout.values()]
    .map((e) => {
      e.sets.sort((a, b) => a.setNumber - b.setNumber);
      return e;
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function prMaps(prs: ExercisePr[]) {
  const byWeight = new Map<string, number>();
  const byVolume = new Map<string, number>();
  for (const p of prs) {
    byWeight.set(p.exerciseId, p.bestWeight);
    byVolume.set(p.exerciseId, p.bestSetVolume);
  }
  return { byWeight, byVolume };
}

export function setBadge(opts: {
  weight: number | null;
  reps: number | null;
  lastWeight: number | null;
  lastReps: number | null;
  prWeight: number;
  prVolume: number;
}): "pr" | "beat-last" | null {
  const vol = setVolume(opts.weight, opts.reps);
  if (opts.weight != null && opts.prWeight > 0 && opts.weight > opts.prWeight) {
    return "pr";
  }
  if (vol > 0 && opts.prVolume > 0 && vol > opts.prVolume) {
    return "pr";
  }
  const lastVol = setVolume(opts.lastWeight, opts.lastReps);
  if (
    opts.weight != null &&
    opts.lastWeight != null &&
    opts.weight > opts.lastWeight
  ) {
    return "beat-last";
  }
  if (vol > 0 && lastVol > 0 && vol > lastVol) {
    return "beat-last";
  }
  return null;
}

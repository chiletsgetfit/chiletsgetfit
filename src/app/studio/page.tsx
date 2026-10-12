import { getTimeZone } from "@/lib/food/server";
import { TimezoneSync } from "@/app/app/food/TimezoneSync";
import { requireStudio } from "@/lib/studio/access";
import { todayInZone } from "@/lib/studio/dates";
import {
  DEFAULT_PILLARS,
  IDEA_COLUMNS,
  PILLAR_COLUMNS,
  TASK_COLUMNS,
  type Idea,
  type Pillar,
  type Task,
} from "@/lib/studio/types";
import { StudioBoard } from "./StudioBoard";

export default async function StudioPage() {
  const { supabase, user, fullName } = await requireStudio();
  const userId = user.id;
  const tz = await getTimeZone();
  const today = todayInZone(tz);

  const loadPillars = () =>
    supabase.from("studio_pillars").select(PILLAR_COLUMNS).eq("owner_id", userId).order("position");

  const [pillarsRes, ideasRes, tasksRes, dayRes] = await Promise.all([
    loadPillars(),
    supabase
      .from("studio_ideas")
      .select(IDEA_COLUMNS)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000),
    // Today's to-dos plus anything left unfinished on an earlier day (it carries forward).
    supabase
      .from("studio_tasks")
      .select(TASK_COLUMNS)
      .eq("owner_id", userId)
      .or(`day.eq.${today},and(day.lt.${today},done_at.is.null)`)
      .order("created_at"),
    supabase.from("studio_days").select("focus").eq("owner_id", userId).eq("day", today).maybeSingle(),
  ]);

  let pillars = (pillarsRes.data ?? []) as Pillar[];
  // First visit: start from her May content pillars. Only after a read that worked,
  // and keyed on (owner_id, name) so two first visits at once can't add two sets.
  if (!pillarsRes.error && pillars.length === 0) {
    await supabase.from("studio_pillars").upsert(
      DEFAULT_PILLARS.map((p, i) => ({ owner_id: userId, name: p.name, color: p.color, position: i })),
      { onConflict: "owner_id,name", ignoreDuplicates: true }
    );
    pillars = ((await loadPillars()).data ?? []) as Pillar[];
  }

  const firstName = fullName.split(" ")[0] || "my";
  const loadError = [pillarsRes, ideasRes, tasksRes, dayRes].some((r) => r.error);

  return (
    <>
      <TimezoneSync serverToday={today} />
      <StudioBoard
        key={today}
        userId={userId}
        firstName={firstName}
        tz={tz}
        initialToday={today}
        initialPillars={pillars}
        initialIdeas={(ideasRes.data ?? []) as Idea[]}
        initialTasks={(tasksRes.data ?? []) as Task[]}
        initialFocus={dayRes.data?.focus ?? ""}
        loadError={loadError}
      />
    </>
  );
}

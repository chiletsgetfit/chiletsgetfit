"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addDays,
  dayLabel,
  dayOfMonth,
  dayOfTimestamp,
  longDate,
  monthPrefix,
  shortDate,
  todayInZone,
  weekDays,
  weekOfMonth,
  weekdayShort,
} from "@/lib/studio/dates";
import { IDEA_PROMPTS } from "@/lib/studio/prompts";
import { DealsCard } from "./DealsCard";
import {
  FORMAT_LABELS,
  IDEA_COLUMNS,
  IDEA_FORMATS,
  IDEA_STATUSES,
  NEXT_STEP,
  PILLAR_COLUMNS,
  PILLAR_SWATCHES,
  TASK_COLUMNS,
  type Idea,
  type IdeaFormat,
  type IdeaStatus,
  type Pillar,
  type Task,
} from "@/lib/studio/types";

const RED = "#B91C1C";
const SERIF = { fontFamily: "var(--font-studio-serif), Georgia, 'Times New Roman', serif" };
const card = "rounded-xl border border-[#1a1a1a1f] bg-white";
const label = "text-[11px] font-medium uppercase tracking-[0.12em] text-[#1a1a1a]";
const muted = "text-[#1a1a1a99]";
const STATUS_TINT: Record<IdeaStatus, string> = {
  idea: "#1a1a1a66",
  planned: "#B4823C",
  shot: "#2F5D8A",
  edited: "#7A6F8F",
  posted: "#4E7A5C",
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16)
      );

type Props = {
  userId: string;
  firstName: string;
  tz: string;
  initialToday: string;
  initialPillars: Pillar[];
  initialIdeas: Idea[];
  initialTasks: Task[];
  initialFocus: string;
  loadError: boolean;
};

export function StudioBoard(props: Props) {
  const { userId, tz } = props;
  const db = useMemo(() => createClient(), []);

  const [today, setToday] = useState(props.initialToday);
  const [viewDay, setViewDay] = useState(props.initialToday);
  const [tasks, setTasks] = useState<Task[]>(props.initialTasks);
  const loadedDays = useRef(new Set<string>([props.initialToday]));
  const [focus, setFocus] = useState<Record<string, string>>({ [props.initialToday]: props.initialFocus });
  // Bumped only when focus text arrives from the server (day change / reload), so a
  // failed save never wipes what she typed.
  const [focusVer, setFocusVer] = useState(0);
  const [ideas, setIdeas] = useState<Idea[]>(props.initialIdeas);
  const [pillars, setPillars] = useState<Pillar[]>(props.initialPillars);
  const [toast, setToast] = useState(props.loadError ? "Some of the board didn't load — pull to refresh." : "");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Saves in flight, so a background reload never paints over a newer change.
  const writes = useRef({ seq: 0, inflight: new Set<Promise<unknown>>() });

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);

  // Optimistic write: the screen already shows the change; undo it if the save fails.
  // Updates/deletes ask for the touched ids back: zero rows means row security
  // filtered the write out (e.g. signed out), which PostgREST reports as success.
  const save = useCallback(
    async (op: PromiseLike<{ error: unknown; data?: unknown }>, undo: () => void) => {
      const p = Promise.resolve(op); // await only this: a query builder re-sends on every then()
      writes.current.seq += 1;
      writes.current.inflight.add(p);
      let failed = false;
      try {
        const { error, data } = await p;
        failed = !!error || (Array.isArray(data) && data.length === 0);
        if (failed) console.error("studio save", error ?? "0 rows changed");
      } catch (e) {
        failed = true;
        console.error("studio save", e);
      } finally {
        writes.current.inflight.delete(p);
      }
      if (failed) {
        undo();
        flash("Couldn't save that — check your connection and try again.");
      }
    },
    [flash]
  );

  // Undo only the fields a patch set, and only where they still hold its value,
  // so a later edit to the same row survives an earlier one failing.
  const revert = <T,>(x: T, before: T, patch: Partial<T>): T => {
    const r = { ...x };
    for (const k of Object.keys(patch) as (keyof T)[]) if (x[k] === patch[k]) r[k] = before[k];
    return r;
  };

  // ---- keep fresh across devices / overnight --------------------------------
  const reload = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const startSeq = writes.current.seq;
      await Promise.allSettled([...writes.current.inflight]);
      const t = todayInZone(tz);
      const [p, i, k, f] = await Promise.all([
        db.from("studio_pillars").select(PILLAR_COLUMNS).eq("owner_id", userId).order("position"),
        db.from("studio_ideas").select(IDEA_COLUMNS).eq("owner_id", userId).order("created_at", { ascending: false }).limit(1000),
        db
          .from("studio_tasks")
          .select(TASK_COLUMNS)
          .eq("owner_id", userId)
          .or(`day.eq.${t},and(day.lt.${t},done_at.is.null)`)
          .order("created_at"),
        db.from("studio_days").select("focus").eq("owner_id", userId).eq("day", t).maybeSingle(),
      ]);
      if (p.error || i.error || k.error || f.error) return; // keep what's on screen
      // She changed something while this was loading: the snapshot is stale, go again.
      if (writes.current.seq !== startSeq || writes.current.inflight.size) continue;
      setToday(t);
      setViewDay(t); // the reload is today's data, so show today
      loadedDays.current = new Set([t]);
      setPillars(p.data as Pillar[]);
      setIdeas(i.data as Idea[]);
      setTasks(k.data as Task[]);
      setFocus({ [t]: f.data?.focus ?? "" });
      setFocusVer((v) => v + 1);
      return;
    }
  }, [db, tz, userId]);

  // Refresh after a while away, and roll over at midnight even if the tab never hid.
  useEffect(() => {
    let hiddenAt = 0;
    const dayChanged = () => todayInZone(tz) !== today;
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (dayChanged() || (hiddenAt && Date.now() - hiddenAt > 60_000)) reload();
    };
    const onFocus = () => { if (dayChanged()) reload(); };
    const tick = setInterval(onFocus, 60_000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload, tz, today]);

  // ---- day navigation --------------------------------------------------------
  const goToDay = async (day: string) => {
    setViewDay(day);
    if (loadedDays.current.has(day)) return;
    loadedDays.current.add(day);
    const [k, f] = await Promise.all([
      db.from("studio_tasks").select(TASK_COLUMNS).eq("owner_id", userId).eq("day", day).order("created_at"),
      db.from("studio_days").select("focus").eq("owner_id", userId).eq("day", day).maybeSingle(),
    ]);
    if (k.error || f.error) {
      loadedDays.current.delete(day);
      flash("Couldn't load that day.");
      return;
    }
    setTasks((prev) => {
      const have = new Set(prev.map((t) => t.id));
      return [...prev, ...(k.data as Task[]).filter((t) => !have.has(t.id))];
    });
    setFocus((prev) => ({ ...prev, [day]: f.data?.focus ?? "" }));
    setFocusVer((v) => v + 1);
  };

  // ---- tasks -----------------------------------------------------------------
  const addTask = (title: string, day = viewDay, ideaId: string | null = null) => {
    const t: Task = { id: newId(), title, day, done_at: null, idea_id: ideaId, created_at: new Date().toISOString() };
    setTasks((prev) => [...prev, t]);
    save(db.from("studio_tasks").insert({ id: t.id, owner_id: userId, title, day, idea_id: ideaId }), () =>
      setTasks((prev) => prev.filter((x) => x.id !== t.id))
    );
  };

  const patchTask = (t: Task, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    save(db.from("studio_tasks").update(patch).eq("id", t.id).select("id"), () =>
      setTasks((prev) => prev.map((x) => (x.id === t.id ? revert(x, t, patch) : x)))
    );
  };

  const toggleTask = (t: Task) => {
    if (t.done_at) return patchTask(t, { done_at: null });
    // Finishing a carried-over to-do from today's list files it under today.
    const refile = t.day < today && viewDay === today;
    patchTask(t, { done_at: new Date().toISOString(), ...(refile ? { day: today } : {}) });
  };

  const deleteTask = (t: Task) => {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    save(db.from("studio_tasks").delete().eq("id", t.id).select("id"), () => setTasks((prev) => [...prev, t]));
  };

  const saveFocus = (day: string, text: string) => {
    const before = focus[day] ?? "";
    if (text === before) return;
    setFocus((prev) => ({ ...prev, [day]: text }));
    save(
      db.from("studio_days").upsert({ owner_id: userId, day, focus: text }, { onConflict: "owner_id,day" }),
      () => setFocus((prev) => (prev[day] === text ? { ...prev, [day]: before } : prev))
    );
  };

  // ---- ideas -----------------------------------------------------------------
  const addIdea = (title: string, extra: Partial<Idea> = {}) => {
    const idea: Idea = {
      id: newId(),
      title,
      notes: "",
      pillar_id: null,
      format: "reel",
      status: "idea",
      post_date: null,
      posted_at: null,
      created_at: new Date().toISOString(),
      ...extra,
    };
    setIdeas((prev) => [idea, ...prev]);
    save(db.from("studio_ideas").insert({ ...idea, owner_id: userId }), () =>
      setIdeas((prev) => prev.filter((x) => x.id !== idea.id))
    );
    return idea;
  };

  const patchIdea = (idea: Idea, patch: Partial<Idea>) => {
    const next = { ...patch };
    if (next.status === "posted") {
      if (!idea.posted_at) next.posted_at = new Date().toISOString();
      // The post date is the day it went out (what the pillar pace counts): if it
      // had none, or was planned for later, it went out today.
      if (!("post_date" in next) && (!idea.post_date || idea.post_date > today)) next.post_date = today;
    }
    if (next.status && next.status !== "posted" && idea.posted_at) next.posted_at = null;
    // Giving a raw idea a post date means it's planned.
    if (next.post_date && idea.status === "idea" && !next.status) next.status = "planned";
    setIdeas((prev) => prev.map((x) => (x.id === idea.id ? { ...x, ...next } : x)));
    save(db.from("studio_ideas").update(next).eq("id", idea.id).select("id"), () =>
      setIdeas((prev) => prev.map((x) => (x.id === idea.id ? revert(x, idea, next) : x)))
    );
  };

  const deleteIdea = (idea: Idea) => {
    setIdeas((prev) => prev.filter((x) => x.id !== idea.id));
    save(db.from("studio_ideas").delete().eq("id", idea.id).select("id"), () => setIdeas((prev) => [idea, ...prev]));
  };

  const ideaToTask = (idea: Idea) => {
    addTask(`${NEXT_STEP[idea.status]}: ${idea.title}`, viewDay, idea.id);
    flash(`Added to ${dayLabel(viewDay, today)}'s to-dos.`);
  };

  // ---- pillars ---------------------------------------------------------------
  const patchPillar = (p: Pillar, patch: Partial<Pillar>) => {
    setPillars((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    save(db.from("studio_pillars").update(patch).eq("id", p.id).select("id"), () =>
      setPillars((prev) => prev.map((x) => (x.id === p.id ? revert(x, p, patch) : x)))
    );
  };

  const addPillar = (name: string) => {
    // A name she used before brings that pillar (and its history) back.
    const same = pillars.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (same) {
      if (same.archived) patchPillar(same, { archived: false });
      else flash(`You already have “${same.name}”.`);
      return;
    }
    const p: Pillar = {
      id: newId(),
      name,
      color: PILLAR_SWATCHES[pillars.length % PILLAR_SWATCHES.length],
      monthly_target: 4,
      position: pillars.length ? Math.max(...pillars.map((x) => x.position)) + 1 : 0,
      archived: false,
    };
    setPillars((prev) => [...prev, p]);
    save(db.from("studio_pillars").insert({ ...p, owner_id: userId }), () =>
      setPillars((prev) => prev.filter((x) => x.id !== p.id))
    );
  };

  const pillarById = useMemo(() => new Map(pillars.map((p) => [p.id, p])), [pillars]);
  const activePillars = pillars.filter((p) => !p.archived);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-6 pt-8 sm:px-6">
      <header className="mb-7 flex items-end justify-between border-b border-[#1a1a1a] pb-3.5">
        <div>
          <h1 className="text-[26px] leading-tight tracking-[-0.4px] sm:text-[30px]" style={SERIF}>
            {props.firstName.toLowerCase()} · the studio
          </h1>
          <p className={`mt-1 text-xs uppercase tracking-[0.06em] ${muted}`}>
            {longDate(today)} · week {weekOfMonth(today)}
          </p>
        </div>
        <span aria-hidden className="mb-1 h-9 w-9 shrink-0 rounded-full" style={{ background: RED }} />
      </header>

      {/* minmax(0, …): let the columns shrink below their content so nothing pushes past a phone screen */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <FocusCard
            key={`${viewDay}|${focusVer}`}
            day={viewDay}
            today={today}
            value={focus[viewDay] ?? ""}
            onSave={(text) => saveFocus(viewDay, text)}
            postsToday={ideas.filter((i) => i.post_date === viewDay && i.status !== "posted")}
            pillarById={pillarById}
          />
          <TodoCard
            today={today}
            viewDay={viewDay}
            tasks={tasks}
            onGo={goToDay}
            onAdd={(title) => addTask(title)}
            onToggle={toggleTask}
            onMove={(t, day) => patchTask(t, { day })}
            onDelete={deleteTask}
          />
        </div>
        <div className="flex flex-col gap-4">
          <WeekCard today={today} ideas={ideas} pillarById={pillarById} onAdd={addIdea} />
          <PaceCard
            today={today}
            tz={tz}
            ideas={ideas}
            pillars={pillars}
            onPatch={patchPillar}
            onAdd={addPillar}
          />
        </div>
      </div>

      <IdeasCard
        ideas={ideas}
        pillars={activePillars}
        pillarById={pillarById}
        today={today}
        viewDay={viewDay}
        onAdd={addIdea}
        onPatch={patchIdea}
        onDelete={deleteIdea}
        onToTask={ideaToTask}
      />

      <DealsCard
        onSaveIdea={(title, notes) => {
          addIdea(title.slice(0, 300), { notes: notes.slice(0, 5000) });
          flash("Saved to your idea bank.");
        }}
      />

      <SparkCard onSave={(t) => { addIdea(t); flash("Saved to your idea bank."); }} />

      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-x-0 bottom-5 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-[#1a1a1a] px-4 py-2 text-sm text-white shadow-lg transition-opacity ${toast ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {toast}
      </div>
    </div>
  );
}

// ---- Today's focus ------------------------------------------------------------

function FocusCard({
  day,
  today,
  value,
  onSave,
  postsToday,
  pillarById,
}: {
  day: string;
  today: string;
  value: string;
  onSave: (text: string) => void;
  postsToday: Idea[];
  pillarById: Map<string, Pillar>;
}) {
  // Keyed on day + a load counter by the parent: fresh server text remounts this.
  const [text, setText] = useState(value);
  return (
    <section className={`${card} rounded-l-none border-l-[3px] px-5 py-4`} style={{ borderLeftColor: RED }}>
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden style={{ color: RED }}>◎</span>
        <h2 className={label}>{day === today ? "today's focus" : `focus · ${dayLabel(day, today)}`}</h2>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 300))}
        onBlur={() => onSave(text.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        rows={2}
        placeholder="the one thing that makes today a win…"
        aria-label="Focus for the day"
        className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#1a1a1a] placeholder:text-[#1a1a1a55] focus:outline-none"
        style={SERIF}
      />
      {postsToday.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {postsToday.map((i) => {
            const p = i.pillar_id ? pillarById.get(i.pillar_id) : undefined;
            return (
              <span key={i.id} className="rounded-md px-2.5 py-1 text-[11px] text-white" style={{ background: p?.color ?? "#1a1a1a" }}>
                posting: {i.title} · {FORMAT_LABELS[i.format]}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---- To-dos -------------------------------------------------------------------

function TodoCard({
  today,
  viewDay,
  tasks,
  onGo,
  onAdd,
  onToggle,
  onMove,
  onDelete,
}: {
  today: string;
  viewDay: string;
  tasks: Task[];
  onGo: (day: string) => void;
  onAdd: (title: string) => void;
  onToggle: (t: Task) => void;
  onMove: (t: Task, day: string) => void;
  onDelete: (t: Task) => void;
}) {
  const [draft, setDraft] = useState("");
  const [showDone, setShowDone] = useState(false);
  const isToday = viewDay === today;
  const open = tasks
    .filter((t) => !t.done_at && (t.day === viewDay || (isToday && t.day < today)))
    .sort((a, b) => (a.day === b.day ? a.created_at.localeCompare(b.created_at) : a.day.localeCompare(b.day)));
  const done = tasks
    .filter((t) => t.done_at && t.day === viewDay)
    .sort((a, b) => (a.done_at ?? "").localeCompare(b.done_at ?? ""));
  const total = open.length + done.length;

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title.slice(0, 300));
    setDraft("");
  };

  return (
    <section className={`${card} px-5 py-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className={label}>to-do</h2>
          {total > 0 && (
            <span className={`text-[11px] ${muted}`}>
              {done.length} of {total} done
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" onClick={() => onGo(addDays(viewDay, -1))} aria-label="Previous day" className="rounded-md px-2 py-0.5 hover:bg-[#1a1a1a0d]">
            ‹
          </button>
          <button
            type="button"
            onClick={() => onGo(today)}
            className="min-w-[84px] rounded-md px-2 py-0.5 text-center text-xs uppercase tracking-[0.08em] hover:bg-[#1a1a1a0d]"
            style={{ color: isToday ? RED : undefined }}
            title="Back to today"
            aria-label={`${dayLabel(viewDay, today)} — back to today`}
          >
            {dayLabel(viewDay, today)}
          </button>
          <button type="button" onClick={() => onGo(addDays(viewDay, 1))} aria-label="Next day" className="rounded-md px-2 py-0.5 hover:bg-[#1a1a1a0d]">
            ›
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#1a1a1a10]">
          <div className="h-full rounded-full transition-all" style={{ width: `${(done.length / total) * 100}%`, background: RED }} />
        </div>
      )}

      <ul className="flex flex-col">
        {open.map((t) => (
          <li key={t.id} className="group flex items-start gap-3 border-b border-[#1a1a1a10] py-2.5 last:border-b-0">
            <Check checked={false} label={t.title} onClick={() => onToggle(t)} />
            <div className="min-w-0 flex-1">
              <p className="break-words text-[14px] leading-snug">{t.title}</p>
              {t.day < viewDay && <p className="mt-0.5 text-[11px]" style={{ color: RED }}>from {dayLabel(t.day, today)}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-70 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => onMove(t, addDays(isToday ? today : viewDay, 1))}
                aria-label={`Move ${t.title} to ${isToday ? "tomorrow" : "the next day"}`}
                className="rounded px-1.5 py-0.5 text-[11px] text-[#1a1a1a99] hover:bg-[#1a1a1a0d] hover:text-[#1a1a1a]"
                title="Move to the next day"
              >
                → {isToday ? "tomorrow" : "next day"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(t)}
                aria-label={`Delete ${t.title}`}
                className="rounded px-1.5 py-0.5 text-[13px] text-[#1a1a1a66] hover:bg-[#1a1a1a0d] hover:text-[#B91C1C]"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {open.length === 0 && (
          <li className={`py-2 text-[13px] ${muted}`} style={SERIF}>
            {done.length ? "all done — beautiful." : "nothing on the list yet."}
          </li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`add a to-do for ${dayLabel(viewDay, today)}…`}
          aria-label="New to-do"
          maxLength={300}
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-lg border border-[#1a1a1a1f] bg-[#FAFAF8] px-3 py-2 text-sm placeholder:text-[#1a1a1a55] focus:border-[#1a1a1a55] focus:outline-none"
        />
        <button type="submit" className="rounded-lg px-3.5 py-2 text-sm text-white" style={{ background: "#1a1a1a" }}>
          add
        </button>
      </form>

      {done.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowDone((s) => !s)} className={`text-[11px] uppercase tracking-[0.1em] ${muted} hover:text-[#1a1a1a]`}>
            {showDone ? "hide" : "show"} done ({done.length})
          </button>
          {showDone && (
            <ul className="mt-1 flex flex-col">
              {done.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-1.5">
                  <Check checked label={t.title} onClick={() => onToggle(t)} />
                  <p className="min-w-0 flex-1 break-words text-[13px] text-[#1a1a1a66] line-through">{t.title}</p>
                  <button
                    type="button"
                    onClick={() => onDelete(t)}
                    aria-label={`Delete ${t.title}`}
                    className="rounded px-1.5 text-[12px] text-[#1a1a1a44] hover:text-[#B91C1C]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Check({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors"
      style={{ borderColor: checked ? RED : "#1a1a1a55", background: checked ? RED : "transparent" }}
    >
      {checked && <span className="text-[11px] leading-none text-white">✓</span>}
    </button>
  );
}

// ---- This week (posting plan) ---------------------------------------------------

function WeekCard({
  today,
  ideas,
  pillarById,
  onAdd,
}: {
  today: string;
  ideas: Idea[];
  pillarById: Map<string, Pillar>;
  onAdd: (title: string, extra?: Partial<Idea>) => Idea;
}) {
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const days = weekDays(addDays(today, offset * 7));

  return (
    <section className={`${card} px-5 py-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={label}>{offset === 0 ? "this week" : offset === 1 ? "next week" : `week of ${shortDate(days[0])}`}</h2>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week" className="rounded-md px-2 hover:bg-[#1a1a1a0d]">‹</button>
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className={`rounded-md px-1.5 text-[11px] uppercase tracking-[0.08em] ${muted} hover:bg-[#1a1a1a0d]`}>
              now
            </button>
          )}
          <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next week" className="rounded-md px-2 hover:bg-[#1a1a1a0d]">›</button>
        </div>
      </div>
      <ul className="flex flex-col">
        {days.map((d) => {
          const posts = ideas.filter((i) => i.post_date === d);
          const isToday = d === today;
          return (
            <li
              key={d}
              className={`flex gap-3 border-b border-[#1a1a1a10] py-2 last:border-b-0 ${isToday ? "-mx-2 rounded px-2" : ""}`}
              style={isToday ? { background: "#B91C1C0a" } : undefined}
            >
              <div className="w-9 shrink-0">
                <p className="text-[10px] uppercase tracking-[0.05em]" style={{ color: isToday ? RED : "#1a1a1a66", fontWeight: isToday ? 600 : 400 }}>
                  {weekdayShort(d)}
                </p>
                <p className="text-[17px] font-medium leading-tight" style={{ color: isToday ? RED : "#1a1a1a" }}>
                  {dayOfMonth(d)}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                {posts.map((i) => {
                  const p = i.pillar_id ? pillarById.get(i.pillar_id) : undefined;
                  return (
                    <a key={i.id} href={`#idea-${i.id}`} className="flex items-center gap-2 text-[13px] hover:underline">
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: p?.color ?? "#1a1a1a44" }} />
                      <span className={`min-w-0 truncate ${i.status === "posted" ? "text-[#1a1a1a66] line-through" : ""}`}>{i.title}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.06em]" style={{ color: STATUS_TINT[i.status] }}>
                        {i.status}
                      </span>
                    </a>
                  );
                })}
                {adding === d ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = draft.trim();
                      if (t) onAdd(t.slice(0, 300), { post_date: d, status: "planned" });
                      setDraft("");
                      setAdding(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => { if (!draft.trim()) setAdding(null); }}
                      onKeyDown={(e) => { if (e.key === "Escape") { setDraft(""); setAdding(null); } }}
                      placeholder="what's posting?"
                      aria-label={`New post for ${weekdayShort(d)}`}
                      className="w-full rounded border border-[#1a1a1a1f] px-2 py-1 text-[13px] focus:outline-none"
                    />
                  </form>
                ) : posts.length === 0 ? (
                  <button type="button" onClick={() => setAdding(d)} className="w-fit text-[12px] text-[#1a1a1a44] hover:text-[#1a1a1a]">
                    + plan a post
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---- Pillar pace ------------------------------------------------------------------

function PaceCard({
  today,
  tz,
  ideas,
  pillars,
  onPatch,
  onAdd,
}: {
  today: string;
  tz: string;
  ideas: Idea[];
  pillars: Pillar[];
  onPatch: (p: Pillar, patch: Partial<Pillar>) => void;
  onAdd: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const removed = pillars.filter((p) => p.archived);
  const [draft, setDraft] = useState("");
  const month = monthPrefix(today);
  const posted = new Map<string, number>();
  for (const i of ideas) {
    if (i.status !== "posted" || !i.pillar_id) continue;
    const when = i.post_date ?? (i.posted_at ? dayOfTimestamp(i.posted_at, tz) : null);
    if (when && when.startsWith(month)) posted.set(i.pillar_id, (posted.get(i.pillar_id) ?? 0) + 1);
  }
  const visible = pillars.filter((p) => !p.archived);
  const monthName = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }).toLowerCase();

  return (
    <section className={`${card} px-5 py-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={label}>{monthName} pillars · pace</h2>
        <button type="button" onClick={() => setEditing((e) => !e)} className={`text-[11px] uppercase tracking-[0.1em] ${muted} hover:text-[#1a1a1a]`}>
          {editing ? "done" : "edit"}
        </button>
      </div>

      {!editing ? (
        <ul className="flex flex-col gap-2.5">
          {visible.map((p) => {
            const n = posted.get(p.id) ?? 0;
            const pct = p.monthly_target ? Math.min(100, (n / p.monthly_target) * 100) : 0;
            return (
              <li key={p.id}>
                <div className="mb-1 flex items-baseline justify-between text-[13px]">
                  <span style={SERIF} className="italic">{p.name}</span>
                  <span className={`text-[12px] ${muted}`}>
                    {n}/{p.monthly_target}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a1a10]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                </div>
              </li>
            );
          })}
          {visible.length === 0 && <li className={`text-[13px] ${muted}`}>no pillars yet — tap edit to add one.</li>}
        </ul>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Change color of ${p.name}`}
                title="Change color"
                onClick={() => onPatch(p, { color: PILLAR_SWATCHES[(PILLAR_SWATCHES.indexOf(p.color) + 1) % PILLAR_SWATCHES.length] })}
                className="h-5 w-5 shrink-0 rounded-full border border-white shadow-[0_0_0_1px_#1a1a1a22]"
                style={{ background: p.color }}
              />
              <input
                defaultValue={p.name}
                maxLength={60}
                aria-label={`Name of ${p.name}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== p.name) onPatch(p, { name: v });
                  else e.target.value = p.name;
                }}
                className="min-w-0 flex-1 rounded border border-[#1a1a1a1f] px-2 py-1 text-[13px] focus:outline-none"
              />
              <label className={`flex items-center gap-1 text-[11px] ${muted}`}>
                <input
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={p.monthly_target}
                  aria-label={`Monthly target for ${p.name}`}
                  onBlur={(e) => {
                    const v = Math.max(0, Math.min(99, Math.round(Number(e.target.value) || 0)));
                    if (v !== p.monthly_target) onPatch(p, { monthly_target: v });
                  }}
                  className="w-12 rounded border border-[#1a1a1a1f] px-1.5 py-1 text-[13px] text-[#1a1a1a] focus:outline-none"
                />
                /mo
              </label>
              {confirmId === p.id ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px]">
                  <button type="button" onClick={() => { onPatch(p, { archived: true }); setConfirmId(null); }} className="rounded px-1.5 py-0.5 text-white" style={{ background: RED }}>
                    remove
                  </button>
                  <button type="button" onClick={() => setConfirmId(null)} className={`px-1 ${muted}`}>
                    keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(p.id)}
                  aria-label={`Remove ${p.name}`}
                  title="Remove (its ideas keep their history; you can bring it back)"
                  className="px-1 text-[13px] text-[#1a1a1a55] hover:text-[#B91C1C]"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {removed.length > 0 && (
            <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-[11px] ${muted}`}>
              removed:
              {removed.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPatch(p, { archived: false })}
                  title="Bring it back"
                  className="rounded-md px-2 py-0.5 italic hover:bg-[#1a1a1a0d]"
                  style={{ ...SERIF, color: p.color }}
                >
                  {p.name} ↺
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = draft.trim();
              if (v) onAdd(v.slice(0, 60));
              setDraft("");
            }}
            className="mt-1 flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="new pillar…"
              aria-label="New pillar"
              maxLength={60}
              className="min-w-0 flex-1 rounded border border-[#1a1a1a1f] px-2 py-1 text-[13px] focus:outline-none"
            />
            <button type="submit" className="rounded bg-[#1a1a1a] px-3 py-1 text-[12px] text-white">
              add
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

// ---- Content ideas ------------------------------------------------------------------

type StatusFilter = "open" | IdeaStatus | "all";

function IdeasCard({
  ideas,
  pillars,
  pillarById,
  today,
  viewDay,
  onAdd,
  onPatch,
  onDelete,
  onToTask,
}: {
  ideas: Idea[];
  pillars: Pillar[];
  pillarById: Map<string, Pillar>;
  today: string;
  viewDay: string;
  onAdd: (title: string, extra?: Partial<Idea>) => Idea;
  onPatch: (idea: Idea, patch: Partial<Idea>) => void;
  onDelete: (idea: Idea) => void;
  onToTask: (idea: Idea) => void;
}) {
  const [status, setStatus] = useState<StatusFilter>("open");
  const [pillar, setPillar] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Opening an idea from the week view (#idea-<id>).
  useEffect(() => {
    const fromHash = () => {
      const m = window.location.hash.match(/^#idea-(.+)$/);
      if (m) {
        const id = m[1];
        setOpenId(id);
        setStatus("all");
        setPillar(null);
        // Clear the hash so the same link works twice, and scroll once it renders.
        history.replaceState(history.state, "", window.location.pathname + window.location.search);
        setTimeout(() => document.getElementById(`idea-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, all: ideas.length };
    for (const s of IDEA_STATUSES) c[s] = 0;
    for (const i of ideas) {
      c[i.status] += 1;
      if (i.status !== "posted") c.open += 1;
    }
    return c;
  }, [ideas]);

  // A pillar removed while it was the filter stops filtering.
  const pillarFilter = pillar && pillars.some((p) => p.id === pillar) ? pillar : null;
  const shown = ideas
    // the idea being edited stays put even when its stage leaves the current tab
    .filter((i) => i.id === openId || (status === "all" ? true : status === "open" ? i.status !== "posted" : i.status === status))
    .filter((i) => i.id === openId || (pillarFilter ? i.pillar_id === pillarFilter : true))
    .sort((a, b) => {
      // dated ones first (soonest), then newest ideas
      if (a.post_date && b.post_date) return a.post_date.localeCompare(b.post_date);
      if (a.post_date) return -1;
      if (b.post_date) return 1;
      return b.created_at.localeCompare(a.created_at);
    });

  const tabs: { key: StatusFilter; text: string }[] = [
    { key: "open", text: "in progress" },
    ...IDEA_STATUSES.map((s) => ({ key: s as StatusFilter, text: s })),
    { key: "all", text: "all" },
  ];

  return (
    <section className={`${card} mt-4 px-5 py-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={label}>content ideas</h2>
        <span className={`text-[11px] ${muted}`}>{counts.open} in progress · {counts.posted} posted</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          onAdd(t.slice(0, 300), { pillar_id: pillarFilter });
          if (status !== "open" && status !== "idea" && status !== "all") setStatus("open"); // so she sees it land
          setDraft("");
        }}
        className="mb-3 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="capture an idea before it's gone…"
          aria-label="New content idea"
          maxLength={300}
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-lg border border-[#1a1a1a1f] bg-[#FAFAF8] px-3 py-2 text-sm placeholder:text-[#1a1a1a55] focus:border-[#1a1a1a55] focus:outline-none"
        />
        <button type="submit" className="rounded-lg px-3.5 py-2 text-sm text-white" style={{ background: RED }}>
          save
        </button>
      </form>

      <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            aria-pressed={status === t.key}
            className="shrink-0 rounded-full px-3 py-1 text-[12px] transition-colors"
            style={status === t.key ? { background: "#1a1a1a", color: "#fff" } : { background: "#1a1a1a08", color: "#1a1a1a99" }}
          >
            {t.text} <span className="opacity-60">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>
      {pillars.length > 0 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => setPillar(null)}
            className="shrink-0 rounded-md px-2.5 py-1 text-[11px]"
            aria-pressed={pillarFilter === null}
            style={pillarFilter === null ? { background: "#1a1a1a12", color: "#1a1a1a" } : { color: "#1a1a1a77" }}
          >
            every pillar
          </button>
          {pillars.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPillar(pillarFilter === p.id ? null : p.id)}
              aria-pressed={pillarFilter === p.id}
              className="shrink-0 rounded-md px-2.5 py-1 text-[11px] italic"
              style={{ ...SERIF, ...(pillarFilter === p.id ? { background: p.color, color: "#fff" } : { color: p.color, background: `${p.color}12` }) }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <ul className="flex flex-col">
        {shown.map((i) => {
          const p = i.pillar_id ? pillarById.get(i.pillar_id) : undefined;
          const isOpen = openId === i.id;
          return (
            <li key={i.id} id={`idea-${i.id}`} className="scroll-mt-24 border-b border-[#1a1a1a10] last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : i.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p?.color ?? "#1a1a1a22" }} />
                <span className={`min-w-0 flex-1 truncate text-[14px] ${i.status === "posted" ? "text-[#1a1a1a77]" : ""}`}>{i.title}</span>
                {i.post_date && (
                  <span className="shrink-0 text-[11px]" style={{ color: i.post_date < today && i.status !== "posted" ? RED : "#1a1a1a77" }}>
                    {dayLabelShort(i.post_date, today)}
                  </span>
                )}
                <span className="hidden shrink-0 text-[11px] text-[#1a1a1a77] sm:inline">{FORMAT_LABELS[i.format]}</span>
                <span className="w-14 shrink-0 text-right text-[10px] uppercase tracking-[0.06em]" style={{ color: STATUS_TINT[i.status] }}>
                  {i.status}
                </span>
              </button>
              {isOpen && (
                <IdeaEditor
                  key={i.id}
                  idea={i}
                  pillars={pillars}
                  pillarById={pillarById}
                  today={today}
                  viewDay={viewDay}
                  onPatch={(patch) => onPatch(i, patch)}
                  onDelete={() => { onDelete(i); setOpenId(null); }}
                  onToTask={() => onToTask(i)}
                />
              )}
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className={`py-3 text-[13px] ${muted}`} style={SERIF}>
            {ideas.length === 0 ? "your idea bank is empty — the sparks below can help." : "nothing here."}
          </li>
        )}
      </ul>
    </section>
  );
}

function dayLabelShort(date: string, today: string) {
  const l = dayLabel(date, today);
  return l.length > 10 ? shortDate(date) : l;
}

function IdeaEditor({
  idea,
  pillars,
  pillarById,
  today,
  viewDay,
  onPatch,
  onDelete,
  onToTask,
}: {
  idea: Idea;
  pillars: Pillar[];
  pillarById: Map<string, Pillar>;
  today: string;
  viewDay: string;
  onPatch: (patch: Partial<Idea>) => void;
  onDelete: () => void;
  onToTask: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [notes, setNotes] = useState(idea.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Typing a year fires 0002-, 0020-, 0202-…: keep it local, save only real dates.
  const [date, setDate] = useState(idea.post_date ?? "");
  const [seenPostDate, setSeenPostDate] = useState(idea.post_date);
  if (idea.post_date !== seenPostDate) {
    // Changed elsewhere (marked posted, a revert): follow it.
    setSeenPostDate(idea.post_date);
    setDate(idea.post_date ?? "");
  }
  const field = "rounded-lg border border-[#1a1a1a1f] bg-white px-3 py-2 text-[13px] focus:border-[#1a1a1a55] focus:outline-none";
  // An archived pillar still shows on the idea that uses it.
  const pillarOptions = idea.pillar_id && !pillars.some((p) => p.id === idea.pillar_id) && pillarById.get(idea.pillar_id)
    ? [...pillars, pillarById.get(idea.pillar_id)!]
    : pillars;

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-lg bg-[#FAFAF8] p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          const t = title.trim();
          if (t && t !== idea.title) onPatch({ title: t.slice(0, 300) });
          else setTitle(idea.title);
        }}
        maxLength={300}
        aria-label="Idea title"
        className={`${field} text-[14px]`}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => { if (notes !== idea.notes) onPatch({ notes: notes.slice(0, 5000) }); }}
        rows={3}
        maxLength={5000}
        placeholder="shot list, caption, audio, who to tag…"
        aria-label="Notes"
        className={`${field} resize-y leading-relaxed`}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stage">
        {IDEA_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPatch({ status: s })}
            aria-pressed={idea.status === s}
            className="rounded-full px-3 py-1 text-[12px]"
            style={idea.status === s ? { background: STATUS_TINT[s], color: "#fff" } : { background: "#1a1a1a0a", color: "#1a1a1a99" }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className={`flex flex-col gap-1 text-[10px] uppercase tracking-[0.1em] ${muted}`}>
          pillar
          <select
            value={idea.pillar_id ?? ""}
            onChange={(e) => onPatch({ pillar_id: e.target.value || null })}
            className={`${field} normal-case tracking-normal text-[#1a1a1a]`}
          >
            <option value="">none</option>
            {pillarOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`flex flex-col gap-1 text-[10px] uppercase tracking-[0.1em] ${muted}`}>
          format
          <select
            value={idea.format}
            onChange={(e) => onPatch({ format: e.target.value as IdeaFormat })}
            className={`${field} normal-case tracking-normal text-[#1a1a1a]`}
          >
            {IDEA_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <label className={`flex flex-col gap-1 text-[10px] uppercase tracking-[0.1em] ${muted}`}>
          post on
          <div className="flex gap-1">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const v = e.target.value;
                setDate(v);
                if (!v || v >= "2000-01-01") onPatch({ post_date: v || null });
              }}
              className={`${field} min-w-0 flex-1 normal-case tracking-normal text-[#1a1a1a]`}
            />
            {date && (
              <button type="button" onClick={() => { setDate(""); onPatch({ post_date: null }); }} aria-label="Clear date" className="px-1 text-[13px] text-[#1a1a1a55] hover:text-[#B91C1C]">
                ✕
              </button>
            )}
          </div>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onToTask} className="rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-[12px] text-white">
          + “{NEXT_STEP[idea.status]}” to {dayLabel(viewDay, today)}&apos;s to-dos
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-[12px]">
            delete this idea?
            <button type="button" onClick={onDelete} className="rounded px-2 py-1 text-white" style={{ background: RED }}>
              delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={`px-1 ${muted}`}>
              keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`text-[12px] ${muted} hover:text-[#B91C1C]`}>
            delete
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Idea sparks ------------------------------------------------------------------

function SparkCard({ onSave }: { onSave: (title: string) => void }) {
  // Start on a fixed prompt (server and client must render the same thing), shuffle after.
  const [n, setN] = useState(0);
  const prompt = IDEA_PROMPTS[n % IDEA_PROMPTS.length];
  return (
    <section className={`${card} mt-4 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="min-w-0">
        <h2 className={label}>idea spark</h2>
        <p className="mt-1 text-[15px] italic" style={SERIF}>
          {prompt}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setN((x) => x + 1 + Math.floor(Math.random() * (IDEA_PROMPTS.length - 1)))}
          className="rounded-lg border border-[#1a1a1a1f] px-3 py-1.5 text-[12px] hover:bg-[#1a1a1a08]"
        >
          shuffle
        </button>
        <button type="button" onClick={() => onSave(prompt)} className="rounded-lg px-3 py-1.5 text-[12px] text-white" style={{ background: RED }}>
          save as idea
        </button>
      </div>
    </section>
  );
}

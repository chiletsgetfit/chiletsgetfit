// The studio (/studio): Amanda's daily board. Shared by the server page and the
// client board, so nothing here may import server-only modules.

export type Pillar = {
  id: string;
  name: string;
  color: string;
  monthly_target: number;
  position: number;
  archived: boolean;
};

export const IDEA_FORMATS = ["reel", "carousel", "single", "story", "tiktok", "other"] as const;
export type IdeaFormat = (typeof IDEA_FORMATS)[number];
export const FORMAT_LABELS: Record<IdeaFormat, string> = {
  reel: "reel",
  carousel: "carousel",
  single: "single tile",
  story: "story",
  tiktok: "tiktok",
  other: "other",
};

export const IDEA_STATUSES = ["idea", "planned", "shot", "edited", "posted"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

// The to-do an idea suggests at each stage ("add to today").
export const NEXT_STEP: Record<IdeaStatus, string> = {
  idea: "plan",
  planned: "shoot",
  shot: "edit",
  edited: "post",
  posted: "share to stories",
};

export type Idea = {
  id: string;
  title: string;
  notes: string;
  pillar_id: string | null;
  format: IdeaFormat;
  status: IdeaStatus;
  post_date: string | null;
  posted_at: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  day: string;
  done_at: string | null;
  idea_id: string | null;
  created_at: string;
};

export const PILLAR_COLUMNS = "id, name, color, monthly_target, position, archived";
export const IDEA_COLUMNS = "id, title, notes, pillar_id, format, status, post_date, posted_at, created_at";
export const TASK_COLUMNS = "id, title, day, done_at, idea_id, created_at";

// Her pillars from the May content plan; seeded the first time she opens the board.
export const DEFAULT_PILLARS: { name: string; color: string }[] = [
  { name: "in bridal form", color: "#B91C1C" },
  { name: "complexion notes", color: "#9F5F4A" },
  { name: "imo", color: "#1A1A1A" },
  { name: "on rotation", color: "#B4823C" },
  { name: "face value", color: "#7A6F8F" },
];

export const PILLAR_SWATCHES = ["#B91C1C", "#9F5F4A", "#1A1A1A", "#B4823C", "#7A6F8F", "#4E7A5C", "#2F5D8A", "#C2697F"];

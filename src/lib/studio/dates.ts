// Calendar-date helpers for the studio. Dates are plain "YYYY-MM-DD" strings in
// the viewer's own time zone; arithmetic happens in UTC so DST never shifts a day.
// Client-safe (no next/headers), unlike src/lib/food/server.ts.

export function todayInZone(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
}

function utc(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday of the week containing `date`.
export function weekStart(date: string): string {
  const dow = utc(date).getUTCDay(); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function weekDays(date: string): string[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthPrefix(date: string): string {
  return date.slice(0, 7); // "YYYY-MM"
}

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  utc(date).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" }).toLowerCase();

export const weekdayShort = (date: string) => fmt(date, { weekday: "short" });
export const dayOfMonth = (date: string) => Number(date.slice(8, 10));
export const longDate = (date: string) => fmt(date, { weekday: "long", month: "long", day: "numeric" });
export const shortDate = (date: string) => fmt(date, { month: "short", day: "numeric" });

// "week 3" = days 15-21 of the month (1-7 is week 1), the way her content plan counts.
export function weekOfMonth(date: string): number {
  return Math.ceil(dayOfMonth(date) / 7);
}

export function dayLabel(date: string, today: string): string {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  if (date === addDays(today, -1)) return "yesterday";
  return fmt(date, { weekday: "short", month: "short", day: "numeric" });
}

// The calendar day a timestamp falls on in `tz`.
export function dayOfTimestamp(ts: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
  } catch {
    return ts.slice(0, 10);
  }
}

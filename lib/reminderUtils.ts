import { dayDiff, startOfDay } from "./dates";

const parseYMD = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Short due label from a Google Tasks due date ("2026-11-18T00:00:00.000Z"; only the date part matters). */
export function dueLabel(due: string | undefined, today: Date): string | undefined {
  if (!due) return undefined;
  const d = parseYMD(due.slice(0, 10));
  const diff = dayDiff(d, today);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface RawTask { id: string; title?: string; status?: string; due?: string; completed?: string; position?: string }

/** Open tasks (soonest due first), then tasks completed today. Older completed tasks are dropped. */
export function pickReminders(tasks: RawTask[], today: Date): { id: string; text: string; dueDate?: string; done: boolean }[] {
  const todayStart = startOfDay(today).getTime();
  const rows = tasks
    .filter((t) => t.title?.trim())
    .filter((t) => t.status !== "completed" || (t.completed && new Date(t.completed).getTime() >= todayStart))
    .map((t, i) => ({ t, i }));
  rows.sort((a, b) => {
    const ad = a.t.status === "completed" ? 1 : 0;
    const bd = b.t.status === "completed" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    const adue = a.t.due?.slice(0, 10) ?? "9999-12-31";
    const bdue = b.t.due?.slice(0, 10) ?? "9999-12-31";
    return adue === bdue ? a.i - b.i : adue < bdue ? -1 : 1;
  });
  return rows.map(({ t }) => ({ id: t.id, text: t.title!.trim(), dueDate: t.due?.slice(0, 10), done: t.status === "completed" }));
}

// ---- Birthdays ----

/** Name shown in the widget: "Grandma's birthday" / "Grandma birthday" / "Grandma" -> "Grandma". */
export const birthdayName = (title: string) => title.trim().replace(/['’]s\s+(birthday|bday)$/i, "").replace(/\s+(birthday|bday)$/i, "").trim() || title.trim();

/** Title on the calendar: "Grandma" -> "Grandma's birthday"; titles that already say birthday stay as they are. */
export const birthdayTitle = (title: string) => (/\b(birthday|bday)\b/i.test(title) ? title.trim() : `${title.trim()}’s birthday`);

/** The Birthdays card lists everything in the next 30 days. */
export const BIRTHDAY_WINDOW_DAYS = 30;

export function daysLabel(daysAway: number): string {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return daysAway <= BIRTHDAY_WINDOW_DAYS ? `${daysAway} days` : "";
}

/** The next occurrence per person, soonest first. */
export function nextBirthdays<T extends { name: string; date: string }>(list: T[], limit = 2): T[] {
  const seen = new Set<string>();
  return [...list]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .filter((b) => (seen.has(b.name.toLowerCase()) ? false : (seen.add(b.name.toLowerCase()), true)))
    .slice(0, limit);
}


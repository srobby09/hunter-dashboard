import { SELECTABLE, type PersonId } from "./people";
import type { Repeat } from "./types";
import { buildTitle } from "./who";

export const TIMEZONE = "America/Vancouver";

export interface NewEventInput {
  title: string;
  who: PersonId[]; // none = Family
  date: string; // YYYY-MM-DD
  allDay: boolean;
  start?: string; // HH:MM
  end?: string;
  repeat: Repeat;
}

export interface GoogleEventBody {
  summary: string;
  start: { date: string } | { dateTime: string; timeZone: string };
  end: { date: string } | { dateTime: string; timeZone: string };
  recurrence?: string[];
}

const FREQ: Record<Exclude<Repeat, "none">, string> = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" };
const REPEATS = ["none", "daily", "weekly", "monthly", "yearly"];

const validDate = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};
const validTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const nextDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/** Checks what the Add event sheet sent and builds the Google Calendar event. The title carries the owner prefix. */
export function buildGoogleEvent(input: unknown): { ok: true; body: GoogleEventBody } | { ok: false; error: string } {
  const i = input as Partial<NewEventInput> | null;
  if (!i || typeof i !== "object") return { ok: false, error: "bad_request" };
  const title = typeof i.title === "string" ? i.title.trim() : "";
  if (!title || title.length > 200) return { ok: false, error: "bad_title" };
  if (!Array.isArray(i.who) || !i.who.every((w) => SELECTABLE.includes(w as PersonId))) return { ok: false, error: "bad_who" };
  if (!validDate(i.date)) return { ok: false, error: "bad_date" };
  if (typeof i.allDay !== "boolean") return { ok: false, error: "bad_request" };
  if (typeof i.repeat !== "string" || !REPEATS.includes(i.repeat)) return { ok: false, error: "bad_repeat" };

  const summary = buildTitle(title, i.who as PersonId[]);
  const recurrence = i.repeat === "none" ? undefined : [`RRULE:FREQ=${FREQ[i.repeat as Exclude<Repeat, "none">]}`];

  if (i.allDay) {
    return { ok: true, body: { summary, start: { date: i.date }, end: { date: nextDay(i.date) }, ...(recurrence && { recurrence }) } };
  }
  if (!validTime(i.start) || !validTime(i.end)) return { ok: false, error: "bad_time" };
  if (i.end <= i.start) return { ok: false, error: "end_before_start" };
  return {
    ok: true,
    body: {
      summary,
      start: { dateTime: `${i.date}T${i.start}:00`, timeZone: TIMEZONE },
      end: { dateTime: `${i.date}T${i.end}:00`, timeZone: TIMEZONE },
      ...(recurrence && { recurrence }),
    },
  };
}

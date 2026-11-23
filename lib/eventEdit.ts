import { buildGoogleEvent, nextDay, validDate, type NewEventInput } from "./eventPayload";
import type { Repeat } from "./types";

export type Scope = "one" | "all"; // this event only / the whole series

/** What the sheet sends when changing an existing event. */
export interface EditInput extends Omit<NewEventInput, "repeat"> {
  scope: Scope;
  originalDate: string; // the day the tapped event was on (needed to shift a whole series)
  repeat: Repeat | "keep"; // "keep" leaves a custom repeat rule as it is
}

/** The parts of a Google Calendar event we touch; everything else is carried through unchanged. */
export interface Resource {
  id?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurrence?: string[];
  recurringEventId?: string;
  [key: string]: unknown;
}

const ms = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86400000);
export const shiftDate = (ymd: string, days: number) => new Date(ms(ymd) + days * 86400000).toISOString().slice(0, 10);

/** "RRULE:FREQ=WEEKLY" -> "weekly". Anything fancier (BYDAY, COUNT, INTERVAL...) is "custom" and is left alone. */
export function repeatOf(recurrence?: string[]): Repeat | "custom" {
  const rules = (recurrence ?? []).filter((r) => r.startsWith("RRULE:"));
  if (rules.length === 0) return "none";
  const m = /^RRULE:FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)$/.exec(rules[0]);
  return rules.length === 1 && m ? (m[1].toLowerCase() as Repeat) : "custom";
}

/** The first day of an event as YYYY-MM-DD. */
const startDay = (r: Resource) => (r.start?.date ?? r.start?.dateTime ?? "").slice(0, 10);

/**
 * Builds the updated event. `target` is the event being changed: the tapped event, or, when changing a
 * whole series ("all"), the series itself. Fields we don't edit (description, guests, reminders...) are kept.
 */
export function applyEdit(target: Resource, input: EditInput): { ok: true; resource: Resource } | { ok: false; error: string } {
  if (!validDate(input.originalDate)) return { ok: false, error: "bad_date" };
  const isSeries = input.scope === "all" && Array.isArray(target.recurrence);

  let date = input.date;
  let endDate = input.endDate ?? input.date;
  if (isSeries) {
    // The tapped day moved by N days, so the whole series moves by N days (and keeps its length)
    const first = startDay(target);
    if (!first || !validDate(date) || !validDate(endDate)) return { ok: false, error: "bad_date" };
    const length = daysBetween(date, endDate);
    date = shiftDate(first, daysBetween(input.originalDate, date));
    endDate = shiftDate(date, length);
  }

  const built = buildGoogleEvent({ ...input, date, endDate, repeat: input.repeat === "keep" ? "none" : input.repeat });
  if (!built.ok) return built;

  const resource: Resource = { ...target, summary: built.body.summary, start: built.body.start, end: built.body.end };
  if (isSeries) {
    if (input.repeat === "keep") { /* leave the series' own rule */ }
    else if (input.repeat === "none") delete resource.recurrence;
    else resource.recurrence = built.body.recurrence;
  } else if (!target.recurringEventId) {
    // a single event: it can gain or lose a repeat
    if (input.repeat === "none" || input.repeat === "keep") delete resource.recurrence;
    else resource.recurrence = built.body.recurrence;
  }
  return { ok: true, resource };
}

export { nextDay };

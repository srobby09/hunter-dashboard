import { googleFetch } from "./google";
import { applyEdit, repeatOf, type EditInput, type Resource, type Scope } from "./eventEdit";
import { findByName } from "./names";
import { birthdayName, birthdayTitle } from "./reminderUtils";
import { parseWho } from "./who";
import type { PersonId } from "./people";

const FAMILY_NAME = process.env.FAMILY_CALENDAR_NAME ?? "Hunter Family";
const BIRTHDAYS_NAME = process.env.BIRTHDAYS_CALENDAR_NAME ?? "Hunter Birthdays";

export interface ApiEvent {
  id: string;
  title: string;
  who: PersonId[];
  start: string; // ISO date-time, or YYYY-MM-DD for all-day
  end: string;
  allDay: boolean;
  recurringId?: string; // set when this is one occurrence of a repeating event
  readOnly?: boolean; // birthdays are edited in Google Calendar, not here
}

const calendarIds: Record<string, string> = {};

async function findCalendarId(name: string): Promise<string> {
  if (calendarIds[name]) return calendarIds[name];
  const r = await googleFetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250");
  if (!r.ok) throw new Error(`calendarList ${r.status}`);
  const j = (await r.json()) as { items?: { id: string; summary: string; summaryOverride?: string }[] };
  const c = findByName(j.items ?? [], name, (x) => [x.summary, x.summaryOverride]);
  if (!c) throw new Error("calendar_not_found");
  calendarIds[name] = c.id;
  return c.id;
}

interface GEvent {
  id: string; status?: string; summary?: string; recurringEventId?: string;
  start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
}

async function rawEvents(name: string, from: string, to: string): Promise<GEvent[]> {
  const id = await findCalendarId(name);
  const out: GEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const p = new URLSearchParams({ timeMin: from, timeMax: to, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    if (pageToken) p.set("pageToken", pageToken);
    const r = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${p}`);
    if (!r.ok) throw new Error(`events ${r.status}`);
    const j = (await r.json()) as { items?: GEvent[]; nextPageToken?: string };
    out.push(...(j.items ?? []).filter((e) => e.status !== "cancelled" && e.start && e.end));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

const startOf = (e: GEvent) => (e.start!.date ?? e.start!.dateTime)!;
const endOf = (e: GEvent) => (e.end!.date ?? e.end!.dateTime)!;

/** Family events, plus birthdays as all-day events (best effort: a problem with the Birthdays calendar never hides the family calendar). */
export async function listEvents(from: string, to: string): Promise<ApiEvent[]> {
  const family: ApiEvent[] = (await rawEvents(FAMILY_NAME, from, to)).map((e) => {
    const { title, who } = parseWho(e.summary ?? "(No title)");
    return { id: e.id, title, who, allDay: !!e.start!.date, start: startOf(e), end: endOf(e), ...(e.recurringEventId && { recurringId: e.recurringEventId }) };
  });
  let birthdays: ApiEvent[] = [];
  try {
    birthdays = (await rawEvents(BIRTHDAYS_NAME, from, to)).map((e) => ({
      id: `b-${e.id}`, title: birthdayTitle(e.summary ?? "Birthday"), who: ["family" as PersonId], allDay: !!e.start!.date, start: startOf(e), end: endOf(e), readOnly: true,
    }));
  } catch { /* ignore */ }
  return [...family, ...birthdays];
}

/** Birthdays for the widget: name and date (YYYY-MM-DD) of each upcoming one. */
export async function listBirthdays(from: string, to: string): Promise<{ name: string; date: string }[]> {
  return (await rawEvents(BIRTHDAYS_NAME, from, to)).map((e) => ({ name: birthdayName(e.summary ?? "Birthday"), date: startOf(e).slice(0, 10) }));
}

/** Creates an event in the family calendar and returns its id. */
export async function insertEvent(body: object): Promise<string> {
  const id = await findCalendarId(FAMILY_NAME);
  const r = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`insert ${r.status}`);
  return ((await r.json()) as { id: string }).id;
}

// ---- Changing and removing events (Hunter Family only) ----

const evUrl = async (id: string) => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(await findCalendarId(FAMILY_NAME))}/events/${encodeURIComponent(id)}`;

async function getResource(id: string): Promise<Resource> {
  const r = await googleFetch(await evUrl(id));
  if (r.status === 404 || r.status === 410) throw new Error("event_not_found");
  if (!r.ok) throw new Error(`getEvent ${r.status}`);
  return (await r.json()) as Resource;
}

/** What the edit sheet needs to know: whether it repeats, and how. */
export async function eventDetails(id: string): Promise<{ recurring: boolean; repeat: ReturnType<typeof repeatOf> }> {
  const ev = await getResource(id);
  const series = ev.recurringEventId ? await getResource(ev.recurringEventId) : ev;
  return { recurring: !!ev.recurringEventId || !!series.recurrence, repeat: repeatOf(series.recurrence) };
}

/** Applies an edit. The whole event is read, changed and written back, so details we don't show (description, guests, reminders) are kept. */
export async function updateEvent(id: string, input: EditInput): Promise<void> {
  const ev = await getResource(id);
  const target = input.scope === "all" && ev.recurringEventId ? await getResource(ev.recurringEventId) : ev;
  const built = applyEdit(target, input);
  if (!built.ok) throw new Error(built.error);
  const r = await googleFetch(await evUrl(target.id!), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(built.resource) });
  if (!r.ok) throw new Error(`updateEvent ${r.status}`);
}

/** Removes one event, or the whole series. */
export async function deleteEvent(id: string, scope: Scope): Promise<void> {
  const ev = await getResource(id);
  const targetId = scope === "all" && ev.recurringEventId ? ev.recurringEventId : id;
  const r = await googleFetch(await evUrl(targetId), { method: "DELETE" });
  if (!r.ok && r.status !== 410) throw new Error(`deleteEvent ${r.status}`);
}

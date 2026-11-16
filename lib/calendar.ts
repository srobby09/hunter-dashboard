import { googleFetch } from "./google";
import { parseWho } from "./who";
import type { PersonId } from "./people";

const CAL_NAME = process.env.FAMILY_CALENDAR_NAME ?? "Hunter Family";

export interface ApiEvent {
  id: string;
  title: string;
  who: PersonId[];
  start: string; // ISO date-time, or YYYY-MM-DD for all-day
  end: string;
  allDay: boolean;
}

let calendarId: string | null = null;

async function findCalendarId(): Promise<string> {
  if (calendarId) return calendarId;
  const r = await googleFetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250");
  if (!r.ok) throw new Error(`calendarList ${r.status}`);
  const j = (await r.json()) as { items?: { id: string; summary: string }[] };
  const c = j.items?.find((x) => x.summary === CAL_NAME);
  if (!c) throw new Error("calendar_not_found");
  calendarId = c.id;
  return c.id;
}

interface GEvent {
  id: string; status?: string; summary?: string;
  start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: { who?: string } };
}

export async function listEvents(from: string, to: string): Promise<ApiEvent[]> {
  const id = await findCalendarId();
  const out: ApiEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const p = new URLSearchParams({ timeMin: from, timeMax: to, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    if (pageToken) p.set("pageToken", pageToken);
    const r = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${p}`);
    if (!r.ok) throw new Error(`events ${r.status}`);
    const j = (await r.json()) as { items?: GEvent[]; nextPageToken?: string };
    for (const e of j.items ?? []) {
      if (e.status === "cancelled" || !e.start || !e.end) continue;
      const allDay = !!e.start.date;
      const { title, who } = parseWho(e.summary ?? "(No title)", e.extendedProperties?.private?.who);
      out.push({ id: e.id, title, who, allDay, start: (e.start.date ?? e.start.dateTime)!, end: (e.end.date ?? e.end.dateTime)! });
    }
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

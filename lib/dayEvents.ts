import { startOfDay, sameDay } from "./dates";
import type { CalEvent } from "./types";

/** Events touching a calendar day: all-day first, then by start time. Multi-day events appear on every day they cover. */
export function eventsOnDay(events: CalEvent[], d: Date): CalEvent[] {
  const dayStart = startOfDay(d).getTime();
  const dayEnd = dayStart + 86400000;
  return events
    .filter((e) => (e.start.getTime() < dayEnd && e.end.getTime() > dayStart) || (e.start.getTime() === e.end.getTime() && sameDay(e.start, d)))
    .sort((a, b) => (a.allDay === b.allDay ? a.start.getTime() - b.start.getTime() : a.allDay ? -1 : 1));
}

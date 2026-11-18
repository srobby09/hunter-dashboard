import { PEOPLE, type PersonId } from "./people";
import { ap, hm, startOfWeek } from "./dates";
import type { CalEvent } from "./types";

/** Colours for the left bar of an event: one per owner, stacked (shared events split the bar). Family is dark green. */
export function barColors(who: PersonId[]): string[] {
  const owners = who.filter((w) => w !== "family");
  return owners.length ? owners.map((w) => PEOPLE[w].color) : [PEOPLE.family.color];
}

/** "Darcy", "Darcy & Kai", "Darcy, Kai & Nora"; Family when nobody is named. */
export function joinNames(who: PersonId[]): string {
  const names = who.filter((w) => w !== "family").map((w) => PEOPLE[w].name);
  if (names.length === 0) return "Family";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Agenda time column: big start ("4:30" + "PM"), small end ("5:30 PM"), or "All day". :00 is dropped. */
export function agendaTime(e: Pick<CalEvent, "start" | "end" | "allDay">): { allDay: true } | { allDay: false; start: string; startAp: string; end: string } {
  if (e.allDay) return { allDay: true };
  return { allDay: false, start: hm(e.start), startAp: ap(e.start), end: `${hm(e.end)} ${ap(e.end)}` };
}

/** The 42 days of the month grid, Sunday first. */
export function monthDays(month: Date): Date[] {
  const gridStart = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
}

/** Open items across both lists, for the tab badge. */
export const openCount = (lists: { done: boolean }[][]) => lists.reduce((n, l) => n + l.filter((x) => !x.done).length, 0);

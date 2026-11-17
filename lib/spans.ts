import { addDays, dayDiff, startOfDay } from "./dates";
import type { CalEvent } from "./types";

/** Last calendar day an event touches (all-day ends are exclusive; a timed event ending at midnight ends the day before). */
const lastDay = (e: CalEvent) => startOfDay(new Date(Math.max(e.end.getTime() - 1, e.start.getTime())));

/** An event that touches more than one calendar day is drawn as one bar running through its days. */
export const isMultiDay = (e: CalEvent) => lastDay(e).getTime() > startOfDay(e.start).getTime();

export interface Seg {
  event: CalEvent;
  startCol: number; // 0 = Sunday
  endCol: number; // inclusive
  lane: number;
  contLeft: boolean; // continues from the previous week
  contRight: boolean; // continues into the next week
}

/** The bars to draw across one week (Sunday start), packed into lanes. */
export function weekSegments(events: CalEvent[], weekStart: Date): { segs: Seg[]; lanes: number } {
  const ws = startOfDay(weekStart);
  const we = addDays(ws, 6);
  const raw: Omit<Seg, "lane">[] = [];
  for (const event of events) {
    if (!isMultiDay(event)) continue;
    const s = startOfDay(event.start);
    const l = lastDay(event);
    if (l < ws || s > we) continue;
    raw.push({ event, startCol: s < ws ? 0 : dayDiff(s, ws), endCol: l > we ? 6 : dayDiff(l, ws), contLeft: s < ws, contRight: l > we });
  }
  raw.sort((a, b) => a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol));
  const laneEnds: number[] = [];
  const segs = raw.map((r) => {
    let lane = laneEnds.findIndex((end) => end < r.startCol);
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(r.endCol); } else laneEnds[lane] = r.endCol;
    return { ...r, lane };
  });
  return { segs, lanes: laneEnds.length };
}

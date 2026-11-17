import assert from "node:assert/strict";
import { test } from "node:test";
import { isMultiDay, weekSegments } from "../lib/spans";
import type { CalEvent } from "../lib/types";

const D = (m: number, d: number, h = 0, min = 0) => new Date(2026, m - 1, d, h, min);
const ev = (id: string, start: Date, end: Date, allDay = false): CalEvent => ({ id, title: id, who: ["family"], start, end, allDay });
const SUN_NOV_15 = D(11, 15);

test("which events count as multi-day", () => {
  assert.equal(isMultiDay(ev("one all-day", D(11, 19), D(11, 20), true)), false); // end is exclusive
  assert.equal(isMultiDay(ev("three days", D(11, 19), D(11, 22), true)), true);
  assert.equal(isMultiDay(ev("timed same day", D(11, 19, 16), D(11, 19, 17))), false);
  assert.equal(isMultiDay(ev("overnight", D(11, 19, 22), D(11, 20, 2))), true);
  assert.equal(isMultiDay(ev("ends at midnight", D(11, 19, 20), D(11, 20, 0))), false);
});

test("a bar runs from its first to its last day", () => {
  const { segs, lanes } = weekSegments([ev("trip", D(11, 19), D(11, 22), true)], SUN_NOV_15); // Thu 19 to Sat 21
  assert.equal(lanes, 1);
  assert.deepEqual([segs[0].startCol, segs[0].endCol, segs[0].contLeft, segs[0].contRight], [4, 6, false, false]);
});

test("a bar crossing weeks continues into the next week", () => {
  const trip = ev("trip", D(11, 20), D(11, 25), true); // Fri 20 to Tue 24
  const w1 = weekSegments([trip], SUN_NOV_15).segs[0];
  const w2 = weekSegments([trip], D(11, 22)).segs[0];
  assert.deepEqual([w1.startCol, w1.endCol, w1.contLeft, w1.contRight], [5, 6, false, true]);
  assert.deepEqual([w2.startCol, w2.endCol, w2.contLeft, w2.contRight], [0, 2, true, false]);
  assert.equal(weekSegments([trip], D(11, 29)).segs.length, 0);
});

test("overlapping bars take separate lanes, later ones reuse a free lane", () => {
  const a = ev("a", D(11, 16), D(11, 19), true); // Mon-Wed
  const b = ev("b", D(11, 18), D(11, 21), true); // Wed-Fri, overlaps a
  const c = ev("c", D(11, 20), D(11, 22), true); // Fri-Sat, free after a
  const { segs, lanes } = weekSegments([c, b, a], SUN_NOV_15);
  const lane = (id: string) => segs.find((s) => s.event.id === id)!.lane;
  assert.equal(lanes, 2);
  assert.deepEqual([lane("a"), lane("b"), lane("c")], [0, 1, 0]);
});

test("single-day events are never drawn as bars", () => {
  assert.equal(weekSegments([ev("x", D(11, 17, 9), D(11, 17, 10))], SUN_NOV_15).segs.length, 0);
});

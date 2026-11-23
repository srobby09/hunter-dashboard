import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEdit, daysBetween, repeatOf, shiftDate, type EditInput, type Resource } from "../lib/eventEdit";
import { buildGoogleEvent } from "../lib/eventPayload";

const input = (o: Partial<EditInput> = {}): EditInput => ({ title: "Ceramics", who: ["darcy", "kai"], date: "2026-11-19", originalDate: "2026-11-19", allDay: false, start: "16:30", end: "17:30", repeat: "none", scope: "one", ...o });
const ok = (t: Resource, i: EditInput) => { const r = applyEdit(t, i); assert.equal(r.ok, true, JSON.stringify(r)); return (r as { resource: Resource }).resource; };
const err = (t: Resource, i: EditInput) => { const r = applyEdit(t, i); assert.equal(r.ok, false); return (r as { error: string }).error; };

const timed: Resource = { id: "e1", summary: "Old", description: "Bring clay", attendees: [{ email: "x@example.com" }], start: { dateTime: "2026-11-19T10:00:00-08:00", timeZone: "America/Vancouver" }, end: { dateTime: "2026-11-19T11:00:00-08:00", timeZone: "America/Vancouver" } };

test("date helpers", () => {
  assert.equal(shiftDate("2026-11-30", 1), "2026-12-01");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-11-19", "2026-11-22"), 3);
  assert.equal(daysBetween("2026-11-22", "2026-11-19"), -3);
});

test("repeat rules map to our options; anything fancier is custom", () => {
  assert.equal(repeatOf(undefined), "none");
  assert.equal(repeatOf(["RRULE:FREQ=WEEKLY"]), "weekly");
  assert.equal(repeatOf(["RRULE:FREQ=YEARLY"]), "yearly");
  assert.equal(repeatOf(["RRULE:FREQ=WEEKLY;BYDAY=MO,WE"]), "custom");
  assert.equal(repeatOf(["RRULE:FREQ=DAILY;COUNT=5"]), "custom");
  assert.equal(repeatOf(["RRULE:FREQ=WEEKLY", "EXDATE:20261126T163000Z"]), "weekly");
});

test("editing a single event changes title, people and times but keeps everything else", () => {
  const r = ok(timed, input());
  assert.equal(r.summary, "D+K: Ceramics");
  assert.deepEqual(r.start, { dateTime: "2026-11-19T16:30:00", timeZone: "America/Vancouver" });
  assert.equal(r.description, "Bring clay");
  assert.deepEqual(r.attendees, [{ email: "x@example.com" }]);
  assert.equal(r.recurrence, undefined);
});

test("changing a timed event to all-day drops the times", () => {
  const r = ok(timed, input({ allDay: true, who: [] }));
  assert.deepEqual(r.start, { date: "2026-11-19" });
  assert.deepEqual(r.end, { date: "2026-11-20" });
  assert.equal(r.summary, "Ceramics");
});

test("a multi-day all-day event keeps its length (the end date is inclusive in the sheet)", () => {
  const trip: Resource = { id: "t", summary: "Ski trip", start: { date: "2026-11-20" }, end: { date: "2026-11-23" } };
  const r = ok(trip, input({ allDay: true, who: [], title: "Ski trip", date: "2026-11-20", endDate: "2026-11-22", originalDate: "2026-11-20" }));
  assert.deepEqual(r.end, { date: "2026-11-23" });
  const longer = ok(trip, input({ allDay: true, who: [], title: "Ski trip", date: "2026-11-20", endDate: "2026-11-24", originalDate: "2026-11-20" }));
  assert.deepEqual(longer.end, { date: "2026-11-25" });
});

test("an overnight event ends on its end date", () => {
  const r = ok(timed, input({ date: "2026-11-19", endDate: "2026-11-20", start: "20:00", end: "09:00", who: ["niko"], title: "Sleepover" }));
  assert.deepEqual(r.end, { dateTime: "2026-11-20T09:00:00", timeZone: "America/Vancouver" });
});

test("bad edits are refused", () => {
  assert.equal(err(timed, input({ end: "16:00" })), "end_before_start");
  assert.equal(err(timed, input({ endDate: "2026-11-18" })), "bad_date");
  assert.equal(err(timed, input({ title: "  " })), "bad_title");
  assert.equal(err(timed, input({ originalDate: "nope" })), "bad_date");
});

const weekly: Resource = { id: "series", summary: "Swim", start: { dateTime: "2026-09-02T17:30:00-07:00", timeZone: "America/Vancouver" }, end: { dateTime: "2026-09-02T18:15:00-07:00", timeZone: "America/Vancouver" }, recurrence: ["RRULE:FREQ=WEEKLY"] };

test("changing a whole series moves it by the same number of days and keeps the repeat", () => {
  // tapped the Wed Nov 18 swim and moved it to Thu Nov 19: the series moves one day later, from its own first day
  const r = ok(weekly, input({ scope: "all", repeat: "keep", title: "Swim", who: ["darcy"], date: "2026-11-19", originalDate: "2026-11-18", start: "17:00", end: "17:45" }));
  assert.equal(r.summary, "Darcy: Swim");
  assert.deepEqual(r.start, { dateTime: "2026-09-03T17:00:00", timeZone: "America/Vancouver" });
  assert.deepEqual(r.end, { dateTime: "2026-09-03T17:45:00", timeZone: "America/Vancouver" });
  assert.deepEqual(r.recurrence, ["RRULE:FREQ=WEEKLY"]);
});

test("changing only the title of a series leaves its start day alone", () => {
  const r = ok(weekly, input({ scope: "all", repeat: "keep", title: "Swim lesson", who: ["darcy"], date: "2026-11-18", originalDate: "2026-11-18", start: "17:30", end: "18:15" }));
  assert.deepEqual(r.start, { dateTime: "2026-09-02T17:30:00", timeZone: "America/Vancouver" });
});

test("a series can change its repeat or stop repeating; a custom rule stays unless replaced", () => {
  const base = { scope: "all" as const, title: "Swim", who: [], date: "2026-11-18", originalDate: "2026-11-18", start: "17:30", end: "18:15" };
  assert.deepEqual(ok(weekly, input({ ...base, repeat: "daily" })).recurrence, ["RRULE:FREQ=DAILY"]);
  assert.equal(ok(weekly, input({ ...base, repeat: "none" })).recurrence, undefined);
  const custom: Resource = { ...weekly, recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE"] };
  assert.deepEqual(ok(custom, input({ ...base, repeat: "keep" })).recurrence, ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE"]);
});

test("changing one occurrence never changes the series' repeat", () => {
  const instance: Resource = { id: "series_20261118T173000Z", recurringEventId: "series", summary: "Swim", start: { dateTime: "2026-11-18T17:30:00-08:00" }, end: { dateTime: "2026-11-18T18:15:00-08:00" } };
  const r = ok(instance, input({ scope: "one", repeat: "daily", title: "Swim", who: [], date: "2026-11-18", originalDate: "2026-11-18", start: "18:00", end: "18:45" }));
  assert.equal(r.recurrence, undefined);
  assert.equal(r.recurringEventId, "series");
  assert.deepEqual(r.start, { dateTime: "2026-11-18T18:00:00", timeZone: "America/Vancouver" });
});

test("a single event can start repeating", () => {
  const r = ok(timed, input({ repeat: "weekly" }));
  assert.deepEqual(r.recurrence, ["RRULE:FREQ=WEEKLY"]);
});

test("new events can be multi-day too", () => {
  const r = buildGoogleEvent({ title: "Camp", who: ["darcy"], date: "2026-12-28", endDate: "2026-12-31", allDay: true, repeat: "none" });
  assert.deepEqual(r.ok && r.body.end, { date: "2027-01-01" });
});

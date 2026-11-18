import assert from "node:assert/strict";
import { test } from "node:test";
import { birthdayName, birthdayTitle, daysLabel, dueLabel, nextBirthdays, pickReminders } from "../lib/reminderUtils";

const TODAY = new Date(2026, 10, 17, 9, 0); // Tue Nov 17

test("due labels", () => {
  assert.equal(dueLabel(undefined, TODAY), undefined);
  assert.equal(dueLabel("2026-11-16T00:00:00.000Z", TODAY), "Overdue");
  assert.equal(dueLabel("2026-11-17T00:00:00.000Z", TODAY), "Today");
  assert.equal(dueLabel("2026-11-18T00:00:00.000Z", TODAY), "Tomorrow");
  assert.equal(dueLabel("2026-11-19T00:00:00.000Z", TODAY), "Thu");
  assert.equal(dueLabel("2026-11-23T00:00:00.000Z", TODAY), "Mon");
  assert.equal(dueLabel("2026-11-24T00:00:00.000Z", TODAY), "Nov 24");
});

test("open tasks come first, soonest due first; only tasks finished today stay", () => {
  const out = pickReminders([
    { id: "a", title: "No date", status: "needsAction" },
    { id: "b", title: "Later", status: "needsAction", due: "2026-11-25T00:00:00.000Z" },
    { id: "c", title: "Soon", status: "needsAction", due: "2026-11-18T00:00:00.000Z" },
    { id: "d", title: "Done today", status: "completed", completed: "2026-11-17T08:00:00.000Z" },
    { id: "e", title: "Done last week", status: "completed", completed: "2026-11-10T08:00:00.000Z" },
    { id: "f", title: "   ", status: "needsAction" },
  ], TODAY);
  assert.deepEqual(out.map((r) => r.id), ["c", "b", "a", "d"]);
  assert.equal(out[3].done, true);
  assert.equal(out[0].dueDate, "2026-11-18");
});

test("birthday names and calendar titles", () => {
  assert.equal(birthdayName("Grandma"), "Grandma");
  assert.equal(birthdayName("Grandma's birthday"), "Grandma");
  assert.equal(birthdayName("Val’s Bday"), "Val");
  assert.equal(birthdayName("Kai birthday"), "Kai");
  assert.equal(birthdayTitle("Grandma"), "Grandma’s birthday");
  assert.equal(birthdayTitle("Grandma's birthday"), "Grandma's birthday");
  assert.equal(birthdayTitle("Val's Bday Weekend"), "Val's Bday Weekend");
});

test("countdown labels", () => {
  assert.equal(daysLabel(0), "Today");
  assert.equal(daysLabel(1), "Tomorrow");
  assert.equal(daysLabel(8), "8 days");
  assert.equal(daysLabel(14), "14 days");
  assert.equal(daysLabel(30), "30 days");
  assert.equal(daysLabel(31), "");
});

test("next birthdays: soonest first, one per person", () => {
  const out = nextBirthdays([
    { name: "Kai", date: "2027-11-20" },
    { name: "Grandma", date: "2026-11-25" },
    { name: "kai", date: "2026-12-03" },
    { name: "Nora", date: "2027-01-10" },
  ]);
  assert.deepEqual(out.map((b) => `${b.name} ${b.date}`), ["Grandma 2026-11-25", "kai 2026-12-03"]);
});

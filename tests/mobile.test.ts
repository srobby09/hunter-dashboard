import assert from "node:assert/strict";
import { test } from "node:test";
import { agendaTime, barColors, joinNames, monthDays, openCount } from "../lib/mobile";

const T = (h: number, m = 0) => new Date(2026, 10, 17, h, m);

test("bar colours: one per owner, shared events split, family is dark green", () => {
  assert.deepEqual(barColors(["darcy"]), ["#E5CD7A"]);
  assert.deepEqual(barColors(["darcy", "kai"]), ["#E5CD7A", "#7381A3"]);
  assert.deepEqual(barColors(["family"]), ["#4A5040"]);
  assert.deepEqual(barColors([]), ["#4A5040"]);
});

test("names read naturally", () => {
  assert.equal(joinNames(["family"]), "Family");
  assert.equal(joinNames(["mom"]), "Sarah");
  assert.equal(joinNames(["darcy", "kai"]), "Darcy & Kai");
  assert.equal(joinNames(["darcy", "kai", "nora"]), "Darcy, Kai & Nora");
});

test("agenda times drop :00 and keep AM/PM small", () => {
  assert.deepEqual(agendaTime({ start: T(16), end: T(17), allDay: false }), { allDay: false, start: "4", startAp: "PM", end: "5 PM" });
  assert.deepEqual(agendaTime({ start: T(8, 30), end: T(9, 15), allDay: false }), { allDay: false, start: "8:30", startAp: "AM", end: "9:15 AM" });
  assert.deepEqual(agendaTime({ start: T(11), end: T(13, 30), allDay: false }), { allDay: false, start: "11", startAp: "AM", end: "1:30 PM" });
  assert.deepEqual(agendaTime({ start: T(0), end: T(0), allDay: true }), { allDay: true });
});

test("month grid is 42 days from a Sunday", () => {
  const days = monthDays(new Date(2026, 10, 1)); // Nov 2026 starts on a Sunday
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 0);
  assert.equal(days[0].getDate(), 1);
  assert.equal(days[41].getMonth(), 11); // runs into December
  const may = monthDays(new Date(2027, 4, 1)); // May 2027 starts on a Saturday
  assert.equal(may[0].getMonth(), 3);
  assert.equal(may[0].getDate(), 25);
});

test("open count adds both lists", () => {
  assert.equal(openCount([[{ done: false }, { done: true }], [{ done: false }, { done: false }]]), 3);
  assert.equal(openCount([[], []]), 0);
});

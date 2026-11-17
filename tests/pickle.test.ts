import assert from "node:assert/strict";
import { test } from "node:test";
import { toMeals } from "../lib/mealUtils";
import { parseGrocery, parseGroceries, parseMeals } from "../lib/pickle";

test("meals: valid days are kept, blank meals become null, junk is dropped", () => {
  const out = parseMeals({ week: "2026-11-15", days: [
    { date: "2026-11-15", meal: "Roast chicken" },
    { date: "2026-11-16", meal: "  " },
    { date: "2026-11-17", meal: null },
    { date: "bad", meal: "x" },
    null,
  ] });
  assert.deepEqual(out, [
    { date: "2026-11-15", meal: "Roast chicken" },
    { date: "2026-11-16", meal: null },
    { date: "2026-11-17", meal: null },
  ]);
  assert.throws(() => parseMeals({}), /pickle_bad_response/);
  assert.throws(() => parseMeals(null), /pickle_bad_response/);
});

test("groceries: ids may be numbers, done must be exactly true, nameless items are dropped", () => {
  const out = parseGroceries({ items: [
    { id: "a", name: "Milk", done: false },
    { id: 7, name: " Eggs ", done: true },
    { id: "c", name: "", done: false },
    { id: "d", name: "Rice" },
    { name: "No id", done: false },
  ] });
  assert.deepEqual(out, [
    { id: "a", name: "Milk", done: false },
    { id: "7", name: "Eggs", done: true },
    { id: "d", name: "Rice", done: false },
  ]);
  assert.throws(() => parseGroceries({ items: "nope" }), /pickle_bad_response/);
});

test("a created grocery item is read from { item }", () => {
  assert.deepEqual(parseGrocery({ item: { id: "z", name: "Bread", done: false } }), { id: "z", name: "Bread", done: false });
  assert.throws(() => parseGrocery({}), /pickle_bad_response/);
});

test("Meals card rows run Sun..Sat in date order and flag today", () => {
  const today = new Date(2026, 10, 17);
  const rows = toMeals([
    { date: "2026-11-18", meal: null },
    { date: "2026-11-17", meal: "Tacos" },
    { date: "2026-11-15", meal: "Roast" },
  ], today);
  assert.deepEqual(rows.map((r) => [r.day, r.meal, r.isToday, r.empty]), [
    ["Sun", "Roast", false, false],
    ["Tue", "Tacos", true, false],
    ["Wed", "Nothing planned", false, true],
  ]);
});

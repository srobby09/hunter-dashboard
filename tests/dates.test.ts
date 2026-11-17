import assert from "node:assert/strict";
import { test } from "node:test";
import { fmtRange, fmtShort } from "../lib/dates";

const T = (h: number, m = 0) => new Date(2026, 10, 17, h, m);

test("month-view times spell out AM and PM", () => {
  assert.equal(fmtShort(T(16), false), "4 PM");
  assert.equal(fmtShort(T(16, 30), false), "4:30 PM");
  assert.equal(fmtShort(T(8, 30), false), "8:30 AM");
  assert.equal(fmtShort(T(0), false), "12 AM");
  assert.equal(fmtShort(T(12), false), "12 PM");
  assert.equal(fmtShort(T(0), true), "All day");
});

test("ranges drop :00 and share AM/PM when they match", () => {
  assert.equal(fmtRange(T(16), T(17), false), "4 – 5 PM");
  assert.equal(fmtRange(T(9), T(14), false), "9 AM – 2 PM");
  assert.equal(fmtRange(T(17, 30), T(18, 15), false), "5:30 – 6:15 PM");
  assert.equal(fmtRange(T(0), T(0), true), "All day");
});

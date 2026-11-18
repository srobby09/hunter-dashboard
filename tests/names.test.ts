import assert from "node:assert/strict";
import { test } from "node:test";
import { findByName, normalizeName } from "../lib/names";

type Cal = { id: string; summary: string; summaryOverride?: string };
const find = (items: Cal[]) => findByName(items, "Hunter Family", (c) => [c.summary, c.summaryOverride])?.id;

test("decorated names still match", () => {
  for (const n of ["·Hunter Family", "• Hunter Family", ".Hunter Family", ". Hunter Family", "hunter family", "  Hunter   Family ", "★ HUNTER FAMILY"]) {
    assert.equal(find([{ id: "x", summary: n }]), "x", n);
  }
});

test("different names do not match", () => {
  for (const n of ["Hunter Family 2", "The Hunter Family", "Hunter", "Family Hunter", "Hunter Familyy"]) {
    assert.equal(find([{ id: "x", summary: n }]), undefined, n);
  }
});

test("an exact match wins over a decorated one", () => {
  assert.equal(find([{ id: "dot", summary: "·Hunter Family" }, { id: "plain", summary: "Hunter Family" }]), "plain");
});

test("a personal rename (summaryOverride) also counts", () => {
  assert.equal(find([{ id: "o", summary: "Family cal", summaryOverride: "·Hunter Family" }]), "o");
});

test("names normalise", () => {
  assert.equal(normalizeName("··  Hunter   Birthdays "), "hunter birthdays");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { isAsleep, isNightHour, nightActive, WAKE_MS } from "../lib/night";
import { dataNotice } from "../lib/notice";

const at = (h: number, m = 0) => new Date(2026, 10, 18, h, m);

test("night is 11 PM up to 6 AM", () => {
  assert.equal(isNightHour(at(22, 59)), false);
  assert.equal(isNightHour(at(23, 0)), true);
  assert.equal(isNightHour(at(0, 0)), true);
  assert.equal(isNightHour(at(5, 59)), true);
  assert.equal(isNightHour(at(6, 0)), false);
  assert.equal(isNightHour(at(12, 0)), false);
});

test("?night=on and ?night=off override the clock", () => {
  assert.equal(nightActive(at(12), "on"), true);
  assert.equal(nightActive(at(2), "off"), false);
  assert.equal(nightActive(at(2), null), true);
  assert.equal(nightActive(at(12), "nonsense"), false);
});

test("the screen wakes for a minute after a touch, then goes black again", () => {
  const touch = 1_000_000;
  assert.equal(isAsleep(true, touch - 5, 0), true); // never touched
  assert.equal(isAsleep(true, touch + 10, touch + WAKE_MS), false); // just woken
  assert.equal(isAsleep(true, touch + WAKE_MS - 1, touch + WAKE_MS), false);
  assert.equal(isAsleep(true, touch + WAKE_MS, touch + WAKE_MS), true);
  assert.equal(isAsleep(false, touch, 0), false); // daytime is never asleep
});

test("notice text for each kind of problem", () => {
  const now = at(16, 40);
  const base = { calError: null, remError: null, lastUpdated: at(16, 32), now };
  assert.equal(dataNotice(base), null);
  assert.equal(dataNotice({ ...base, calError: "expired" }), "Google login expired · tap to reconnect");
  assert.equal(dataNotice({ ...base, calError: "not_connected" }), "Google not connected · tap to set up");
  assert.equal(dataNotice({ ...base, calError: "calendar_not_found" }), "Can’t find the Hunter Family calendar · tap for Settings");
  assert.equal(dataNotice({ ...base, calError: "offline" }), "Calendar can’t be reached · last updated 4:32 PM");
  assert.equal(dataNotice({ ...base, calError: "offline", lastUpdated: null }), "Calendar can’t be reached");
  assert.equal(dataNotice({ ...base, remError: "expired" }), "Google login expired · tap to reconnect");
  assert.equal(dataNotice({ ...base, remError: "save" }), null); // a failed save is shown in its own card
});

test("data that stops refreshing is flagged after 15 minutes", () => {
  assert.equal(dataNotice({ calError: null, remError: null, lastUpdated: at(16, 30), now: at(16, 44) }), null);
  assert.equal(dataNotice({ calError: null, remError: null, lastUpdated: at(16, 30), now: at(16, 46) }), "Not updating · last updated 4:30 PM");
});

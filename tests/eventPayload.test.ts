import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGoogleEvent } from "../lib/eventPayload";
import { parseWeather } from "../lib/weather";

const ok = (x: unknown) => { const r = buildGoogleEvent(x); assert.equal(r.ok, true); return (r as { body: any }).body; };
const err = (x: unknown) => { const r = buildGoogleEvent(x); assert.equal(r.ok, false); return (r as { error: string }).error; };
const base = { title: "Ceramics", who: ["darcy", "kai"], date: "2026-11-19", allDay: false, start: "16:30", end: "17:30", repeat: "none" };

test("a timed event is saved with the owner prefix and the Vancouver time zone", () => {
  assert.deepEqual(ok(base), {
    summary: "D+K: Ceramics",
    start: { dateTime: "2026-11-19T16:30:00", timeZone: "America/Vancouver" },
    end: { dateTime: "2026-11-19T17:30:00", timeZone: "America/Vancouver" },
  });
});

test("no people means a Family event with no prefix; one person uses the full name", () => {
  assert.equal(ok({ ...base, who: [] }).summary, "Ceramics");
  assert.equal(ok({ ...base, who: ["darcy"] }).summary, "Darcy: Ceramics");
});

test("an all-day event ends the next day (Google's end date is exclusive), including across months and years", () => {
  assert.deepEqual(ok({ ...base, allDay: true, who: [] }).end, { date: "2026-11-20" });
  assert.deepEqual(ok({ ...base, allDay: true, date: "2026-11-30" }).end, { date: "2026-12-01" });
  assert.deepEqual(ok({ ...base, allDay: true, date: "2026-12-31" }).end, { date: "2027-01-01" });
  assert.deepEqual(ok({ ...base, allDay: true, date: "2028-02-28" }).end, { date: "2028-02-29" });
});

test("repeats become a Google recurrence rule", () => {
  assert.equal(ok(base).recurrence, undefined);
  assert.deepEqual(ok({ ...base, repeat: "daily" }).recurrence, ["RRULE:FREQ=DAILY"]);
  assert.deepEqual(ok({ ...base, repeat: "weekly" }).recurrence, ["RRULE:FREQ=WEEKLY"]);
  assert.deepEqual(ok({ ...base, repeat: "monthly" }).recurrence, ["RRULE:FREQ=MONTHLY"]);
  assert.deepEqual(ok({ ...base, repeat: "yearly" }).recurrence, ["RRULE:FREQ=YEARLY"]);
});

test("bad input is refused", () => {
  assert.equal(err(null), "bad_request");
  assert.equal(err({ ...base, title: "   " }), "bad_title");
  assert.equal(err({ ...base, title: "x".repeat(201) }), "bad_title");
  assert.equal(err({ ...base, who: ["family"] }), "bad_who");
  assert.equal(err({ ...base, who: ["bob"] }), "bad_who");
  assert.equal(err({ ...base, date: "2026-02-30" }), "bad_date");
  assert.equal(err({ ...base, date: "11/19/2026" }), "bad_date");
  assert.equal(err({ ...base, repeat: "hourly" }), "bad_repeat");
  assert.equal(err({ ...base, start: "25:00" }), "bad_time");
  assert.equal(err({ ...base, end: undefined }), "bad_time");
  assert.equal(err({ ...base, end: "16:30" }), "end_before_start");
  assert.equal(err({ ...base, end: "09:00" }), "end_before_start");
});

test("weather is read from an Open-Meteo response", () => {
  const w = parseWeather({ current: { temperature_2m: 8.6, weather_code: 61 }, daily: { temperature_2m_max: [10.2], temperature_2m_min: [5.7] } });
  assert.deepEqual(w, { icon: "rain", label: "Light rain", temp: 9, high: 10, low: 6 });
  assert.equal(parseWeather({ current: { temperature_2m: 20, weather_code: 0 }, daily: { temperature_2m_max: [22], temperature_2m_min: [11] } })?.icon, "sun");
  assert.equal(parseWeather({ current: { temperature_2m: -3, weather_code: 73 }, daily: { temperature_2m_max: [0], temperature_2m_min: [-6] } })?.label, "Snow");
  assert.equal(parseWeather({ current: { temperature_2m: 5, weather_code: 999 }, daily: { temperature_2m_max: [6], temperature_2m_min: [1] } })?.label, "Cloudy");
  assert.equal(parseWeather({}), null);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { authConfigured, authProblem, checkSession, makeSession, passcodeMatches, REFRESH_AFTER_MS, safeNext, SESSION_MS } from "../lib/auth";
import { loginAllowed, LIMITS, recordFailure, recordSuccess, type Counter } from "../lib/rateLimit";

const env = { FAMILY_PASSCODE: "correct horse battery", AUTH_SECRET: "a".repeat(40) };
const NOW = 1_800_000_000_000;

test("login is only on when both settings are present and long enough", () => {
  assert.equal(authConfigured(env), true);
  assert.equal(authConfigured({}), false);
  assert.equal(authConfigured({ FAMILY_PASSCODE: "short", AUTH_SECRET: "a".repeat(40) }), false);
  assert.equal(authConfigured({ FAMILY_PASSCODE: "correct horse battery", AUTH_SECRET: "tooshort" }), false);
  assert.equal(authProblem({}), null);
  assert.match(authProblem({ FAMILY_PASSCODE: "correct horse battery" })!, /AUTH_SECRET is missing/);
  assert.match(authProblem({ FAMILY_PASSCODE: "short", AUTH_SECRET: "a".repeat(40) })!, /at least 8/);
});

test("a fresh session is accepted, and is not refreshed straight away", async () => {
  const t = await makeSession(env, NOW);
  assert.deepEqual(await checkSession(t, env, NOW + 1000), { ok: true, refresh: false });
});

test("a session older than a week asks to be refreshed; one past six months is refused", async () => {
  const t = await makeSession(env, NOW);
  assert.deepEqual(await checkSession(t, env, NOW + REFRESH_AFTER_MS + 1), { ok: true, refresh: true });
  assert.deepEqual(await checkSession(t, env, NOW + SESSION_MS + 1), { ok: false, refresh: false });
});

test("a tampered, truncated or made-up cookie is refused", async () => {
  const t = await makeSession(env, NOW);
  const [iat, exp, sig] = t.split(".");
  for (const bad of [undefined, "", "abc", `${iat}.${exp}`, `${iat}.${Number(exp) + 1000}.${sig}`, `${iat}.${exp}.${sig}x`, `${iat}.${exp}.${sig}.extra`, `x.y.z`, `${Number(iat) + 99999999999}.${exp}.${sig}`]) {
    assert.equal((await checkSession(bad, env, NOW + 1000)).ok, false, String(bad));
  }
});

test("changing the passcode or the secret signs everyone out", async () => {
  const t = await makeSession(env, NOW);
  assert.equal((await checkSession(t, { ...env, FAMILY_PASSCODE: "a different passcode" }, NOW + 1000)).ok, false);
  assert.equal((await checkSession(t, { ...env, AUTH_SECRET: "b".repeat(40) }, NOW + 1000)).ok, false);
  assert.equal((await checkSession(t, {}, NOW + 1000)).ok, false);
});

test("only the exact passcode matches", async () => {
  assert.equal(await passcodeMatches("correct horse battery", env), true);
  for (const wrong of ["", "correct horse batter", "correct horse battery ", "CORRECT HORSE BATTERY", "x".repeat(500)]) assert.equal(await passcodeMatches(wrong, env), false, wrong);
  assert.equal(await passcodeMatches("anything", {}), false);
});

test("after sign-in you only go to pages on this site", () => {
  assert.equal(safeNext("/"), "/");
  assert.equal(safeNext("/settings"), "/settings");
  assert.equal(safeNext("/?night=on"), "/?night=on");
  for (const evil of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/login?next=/", "/api/google/connect", "/ok\nSet-Cookie: x=1"]) assert.equal(safeNext(evil), "/", String(evil));
});

const fake = (): Counter & { data: Map<string, number> } => {
  const data = new Map<string, number>();
  return { data, async get(k) { return data.get(k) ?? 0; }, async incr(k) { data.set(k, (data.get(k) ?? 0) + 1); }, async del(k) { data.delete(k); } };
};

test("a device is locked out after too many wrong tries, others are not", async () => {
  const c = fake();
  for (let i = 0; i < LIMITS.perIp - 1; i++) { await recordFailure(c, "1.1.1.1"); assert.deepEqual(await loginAllowed(c, "1.1.1.1"), { ok: true }); }
  await recordFailure(c, "1.1.1.1");
  assert.deepEqual(await loginAllowed(c, "1.1.1.1"), { ok: false, scope: "ip" });
  assert.deepEqual(await loginAllowed(c, "2.2.2.2"), { ok: true });
});

test("a correct passcode clears that device's count", async () => {
  const c = fake();
  for (let i = 0; i < 5; i++) await recordFailure(c, "1.1.1.1");
  await recordSuccess(c, "1.1.1.1");
  assert.equal(await c.get("login:ip:1.1.1.1"), 0);
});

test("too many wrong tries from anywhere locks everyone for a while", async () => {
  const c = fake();
  for (let i = 0; i < LIMITS.global; i++) await recordFailure(c, `10.0.0.${i}`);
  assert.deepEqual(await loginAllowed(c, "9.9.9.9"), { ok: false, scope: "all" });
});

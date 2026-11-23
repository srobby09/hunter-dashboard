// Slows down guessing of the passcode: a few wrong tries per device, and a cap on wrong tries overall.
import { kvDel, kvGet, kvIncr, storeConfigured } from "./store";

export const LIMITS = { perIp: 8, perIpSeconds: 15 * 60, global: 60, globalSeconds: 60 * 60 };

export interface Counter {
  get(key: string): Promise<number>;
  incr(key: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

const memory = new Map<string, { n: number; until: number }>();
const inMemory: Counter = {
  async get(key) { const e = memory.get(key); return e && e.until > Date.now() ? e.n : 0; },
  async incr(key, ttl) { const e = memory.get(key); memory.set(key, e && e.until > Date.now() ? { n: e.n + 1, until: e.until } : { n: 1, until: Date.now() + ttl * 1000 }); },
  async del(key) { memory.delete(key); },
};
const redis: Counter = {
  async get(key) { return Number((await kvGet(key)) ?? 0) || 0; },
  incr: (key, ttl) => kvIncr(key, ttl),
  del: (key) => kvDel(key),
};
/** Shared across all servers when Redis is set up; otherwise per server (weaker, but still slows a guesser). */
export const defaultCounter = (): Counter => (storeConfigured() ? redis : inMemory);

const ipKey = (ip: string) => `login:ip:${ip}`;
const ALL = "login:all";

export async function loginAllowed(c: Counter, ip: string): Promise<{ ok: true } | { ok: false; scope: "ip" | "all" }> {
  if ((await c.get(ALL)) >= LIMITS.global) return { ok: false, scope: "all" };
  if ((await c.get(ipKey(ip))) >= LIMITS.perIp) return { ok: false, scope: "ip" };
  return { ok: true };
}
export async function recordFailure(c: Counter, ip: string) {
  await c.incr(ipKey(ip), LIMITS.perIpSeconds);
  await c.incr(ALL, LIMITS.globalSeconds);
}
export const recordSuccess = (c: Counter, ip: string) => c.del(ipKey(ip));

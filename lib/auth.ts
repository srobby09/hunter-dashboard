// The family passcode login. Works in the edge gatekeeper (middleware) and in normal routes, so it only uses Web Crypto.
// A signed cookie proves someone entered the passcode. Changing FAMILY_PASSCODE or AUTH_SECRET signs everyone out.

export const COOKIE = "hunter_session";
export const SESSION_MS = 180 * 24 * 3600 * 1000; // stays signed in for about six months...
export const REFRESH_AFTER_MS = 7 * 24 * 3600 * 1000; // ...and each week of use extends it
export const MIN_PASSCODE = 8;
export const MIN_SECRET = 32;

type Env = Record<string, string | undefined>;
const enc = new TextEncoder();

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data))));
}

/** Compares two strings without stopping at the first difference. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Both settings present and long enough. Until then the login is off. */
export function authConfigured(env: Env = process.env): boolean {
  return (env.FAMILY_PASSCODE ?? "").length >= MIN_PASSCODE && (env.AUTH_SECRET ?? "").length >= MIN_SECRET;
}

/** What is wrong with the login settings, in words (for the Settings page). */
export function authProblem(env: Env = process.env): string | null {
  const p = env.FAMILY_PASSCODE ?? "", s = env.AUTH_SECRET ?? "";
  if (!p && !s) return null;
  if (!p) return "FAMILY_PASSCODE is missing.";
  if (!s) return "AUTH_SECRET is missing.";
  if (p.length < MIN_PASSCODE) return `FAMILY_PASSCODE must be at least ${MIN_PASSCODE} characters.`;
  if (s.length < MIN_SECRET) return `AUTH_SECRET must be at least ${MIN_SECRET} characters.`;
  return null;
}

// Signing with both settings means changing the passcode invalidates every existing session
const signingKey = (env: Env) => `${env.AUTH_SECRET}|${env.FAMILY_PASSCODE}`;

export async function makeSession(env: Env = process.env, now = Date.now()): Promise<string> {
  const payload = `${now}.${now + SESSION_MS}`;
  return `${payload}.${await hmac(signingKey(env), payload)}`;
}

export async function checkSession(token: string | undefined, env: Env = process.env, now = Date.now()): Promise<{ ok: boolean; refresh: boolean }> {
  const bad = { ok: false, refresh: false };
  if (!token || !authConfigured(env)) return bad;
  const [iat, exp, sig, ...extra] = token.split(".");
  if (!iat || !exp || !sig || extra.length || !/^\d+$/.test(iat) || !/^\d+$/.test(exp)) return bad;
  if (!safeEqual(sig, await hmac(signingKey(env), `${iat}.${exp}`))) return bad;
  if (Number(exp) <= now || Number(iat) > now + 60_000) return bad;
  return { ok: true, refresh: now - Number(iat) > REFRESH_AFTER_MS };
}

/** Whether what was typed is the passcode (both sides are hashed first, so the comparison always takes the same time). */
export async function passcodeMatches(input: string, env: Env = process.env): Promise<boolean> {
  const digest = async (s: string) => b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
  const [a, b] = await Promise.all([digest(input), digest(env.FAMILY_PASSCODE ?? "")]);
  return authConfigured(env) && safeEqual(a, b);
}

/** Where to go after signing in. Only places on this site are allowed (no redirects to other websites). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.includes("\n") || next.includes("\r")) return "/";
  if (next.startsWith("/login") || next.startsWith("/api/")) return "/";
  return next;
}

/** Whether the request came in over https (behind Vercel's proxy the scheme arrives in a header). */
export const isHttps = (req: { url: string; headers: { get(name: string): string | null } }) =>
  (req.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https" || new URL(req.url).protocol === "https:";

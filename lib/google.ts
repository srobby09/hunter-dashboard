import { kvDel, kvGet, kvSet, storeConfigured } from "./store";

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks",
];

const REFRESH_KEY = "google:refresh_token";
const CONNECTED_AT_KEY = "google:connected_at";

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const redirectUri = (origin: string) => `${origin}/api/google/callback`;

export function authUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // gives us a refresh token
    prompt: "consent", // always re-issue one, so Reconnect works
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

interface TokenResponse { access_token: string; expires_in: number; refresh_token?: string; error?: string; error_description?: string }

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
    cache: "no-store",
  });
  return (await r.json()) as TokenResponse;
}

export async function connectWithCode(origin: string, code: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (t.error || !t.refresh_token) throw new Error(t.error_description ?? t.error ?? "Google did not return a refresh token");
  await kvSet(REFRESH_KEY, t.refresh_token);
  await kvSet(CONNECTED_AT_KEY, new Date().toISOString());
  cached = null;
}

export async function disconnect(): Promise<void> {
  await kvDel(REFRESH_KEY);
  await kvDel(CONNECTED_AT_KEY);
  cached = null;
}

export async function connectionInfo(): Promise<{ connected: boolean; connectedAt: string | null }> {
  if (!storeConfigured()) return { connected: false, connectedAt: null };
  const [rt, at] = await Promise.all([kvGet(REFRESH_KEY), kvGet(CONNECTED_AT_KEY)]);
  return { connected: !!rt, connectedAt: at };
}

let cached: { token: string; exp: number } | null = null;

/** Short-lived access token, refreshed from the stored refresh token. Throws if not connected / expired. */
export async function getAccessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const rt = await kvGet(REFRESH_KEY);
  if (!rt) throw new Error("not_connected");
  const t = await tokenRequest({ refresh_token: rt, grant_type: "refresh_token" });
  if (t.error) throw new Error(t.error === "invalid_grant" ? "expired" : t.error);
  cached = { token: t.access_token, exp: Date.now() + t.expires_in * 1000 };
  return cached.token;
}

export async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, cache: "no-store" });
}

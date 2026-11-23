// Tiny key-value store over the Upstash Redis REST API (added via the Vercel Marketplace).
// Holds the Google refresh token so no keys ever live on the iPad.
const url = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeConfigured = () => !!(url() && token());

async function cmd(args: (string | number)[]): Promise<unknown> {
  const r = await fetch(url()!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: unknown; error?: string };
  if (!r.ok || j.error) throw new Error(j.error ?? r.statusText);
  return j.result;
}

export const kvGet = async (key: string) => (await cmd(["GET", key])) as string | null;
export const kvSet = async (key: string, value: string) => void (await cmd(["SET", key, value]));
export const kvDel = async (key: string) => void (await cmd(["DEL", key]));
/** Adds one to a counter that disappears after ttlSeconds (counted from the first add). */
export async function kvIncr(key: string, ttlSeconds: number): Promise<void> {
  const n = (await cmd(["INCR", key])) as number;
  if (n === 1) await cmd(["EXPIRE", key, ttlSeconds]);
}

// The last good data is kept on the device, so after a reload with a bad connection the screen still shows
// the last update instead of going empty. Every read and write is guarded: storage can be missing or full.
const PREFIX = "hunter:";

export function readCache<T>(key: string): { t: number; v: T } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const j = JSON.parse(raw) as { t?: unknown; v?: T };
    return typeof j?.t === "number" && j.v !== undefined ? { t: j.t, v: j.v } : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, v: T): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v })); } catch { /* full or unavailable */ }
}

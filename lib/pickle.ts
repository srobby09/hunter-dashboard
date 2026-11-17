// The dashboard reads Meals and the grocery list ("To get") from Pickle through Pickle's
// /api/dashboard/* routes, protected by a shared secret. Server-side only: the secret never reaches the iPad.

export interface MealDay { date: string; meal: string | null } // date: YYYY-MM-DD
export interface Grocery { id: string; name: string; done: boolean }

const base = () => process.env.PICKLE_API_URL?.replace(/\/+$/, "");
const secret = () => process.env.PICKLE_DASHBOARD_SECRET;
export const pickleConfigured = () => !!(base() && secret());

export class PickleError extends Error {
  constructor(public code: "pickle_not_configured" | "pickle_unauthorized" | "pickle_unreachable" | "pickle_bad_response") { super(code); }
}

export function parseMeals(j: unknown): MealDay[] {
  const days = (j as { days?: unknown } | null)?.days;
  if (!Array.isArray(days)) throw new PickleError("pickle_bad_response");
  return days.flatMap((d: { date?: unknown; meal?: unknown }) =>
    typeof d?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date)
      ? [{ date: d.date, meal: typeof d.meal === "string" && d.meal.trim() ? d.meal.trim() : null }]
      : [],
  );
}

const toGrocery = (x: { id?: unknown; name?: unknown; done?: unknown } | null): Grocery[] =>
  x && (typeof x.id === "string" || typeof x.id === "number") && typeof x.name === "string" && x.name.trim()
    ? [{ id: String(x.id), name: x.name.trim(), done: x.done === true }]
    : [];

export function parseGroceries(j: unknown): Grocery[] {
  const items = (j as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) throw new PickleError("pickle_bad_response");
  return items.flatMap((x) => toGrocery(x));
}

export function parseGrocery(j: unknown): Grocery {
  const g = toGrocery((j as { item?: never } | null)?.item ?? null)[0];
  if (!g) throw new PickleError("pickle_bad_response");
  return g;
}

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  if (!pickleConfigured()) throw new PickleError("pickle_not_configured");
  let r: Response;
  try {
    r = await fetch(`${base()}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new PickleError("pickle_unreachable");
  }
  if (r.status === 401 || r.status === 403) throw new PickleError("pickle_unauthorized");
  if (!r.ok) throw new PickleError("pickle_unreachable");
  return r.json().catch(() => { throw new PickleError("pickle_bad_response"); });
}

export const getMeals = async (week: string) => parseMeals(await call(`/api/dashboard/meals?week=${encodeURIComponent(week)}`));
export const getGroceries = async () => parseGroceries(await call("/api/dashboard/groceries"));
export const addGrocery = async (name: string) => parseGrocery(await call("/api/dashboard/groceries", { method: "POST", body: JSON.stringify({ name }) }));
export const setGroceryDone = async (id: string, done: boolean) => void (await call("/api/dashboard/groceries", { method: "PATCH", body: JSON.stringify({ id, done }) }));

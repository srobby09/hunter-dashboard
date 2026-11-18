/** Names are compared ignoring case and any leading symbols or spaces ("• Hunter Family", ".Hunter Family"), so decorating a calendar's name doesn't break the link. */
export const normalizeName = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Finds the item whose name matches: an exact match wins, otherwise the first forgiving match. */
export function findByName<T>(items: T[], wanted: string, names: (item: T) => (string | undefined)[]): T | undefined {
  const exact = items.find((i) => names(i).some((n) => n === wanted));
  if (exact) return exact;
  const w = normalizeName(wanted);
  return items.find((i) => names(i).some((n) => n !== undefined && normalizeName(n) === w));
}

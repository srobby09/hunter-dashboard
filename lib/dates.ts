export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** Weeks start on Sunday. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -d.getDay());
export const dayDiff = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const longLabel = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
export const shortMD = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const hm = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  return m ? `${h}:${String(m).padStart(2, "0")}` : `${h}`;
};
const ap = (d: Date) => (d.getHours() >= 12 ? "PM" : "AM");

/** "4 – 5 PM", "9 AM – 2 PM", "5:30 – 6:15 PM" */
export function fmtRange(start: Date, end: Date, allDay: boolean): string {
  if (allDay) return "All day";
  return ap(start) === ap(end)
    ? `${hm(start)} – ${hm(end)} ${ap(end)}`
    : `${hm(start)} ${ap(start)} – ${hm(end)} ${ap(end)}`;
}

/** Month-view short start: "4 PM", "4:30 PM", "8:30 AM", "All day" */
export function fmtShort(start: Date, allDay: boolean): string {
  if (allDay) return "All day";
  return `${hm(start)} ${ap(start)}`;
}

export const fmtClock = (d: Date) =>
  `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${ap(d)}`;

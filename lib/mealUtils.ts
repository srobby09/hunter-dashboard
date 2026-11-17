import { DOW, sameDay } from "./dates";
import type { MealDay } from "./pickle";
import type { Meal } from "./types";

const local = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Seven rows Sun..Sat for the Meals card; today's is flagged. Days Pickle didn't send are left out. */
export function toMeals(days: MealDay[], today: Date): Meal[] {
  return days
    .map((d) => ({ d, date: local(d.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ d, date }) => ({ day: DOW[date.getDay()], meal: d.meal ?? "Nothing planned", empty: d.meal === null, isToday: sameDay(date, today) }));
}

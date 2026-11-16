// Sample data from the design canvas. Replaced by real sources in later build steps.
import { addDays, dayDiff, sameDay, startOfDay } from "./dates";
import type { PersonId } from "./people";
import type { Birthday, CalEvent, GroceryItem, Meal, Reminder, Weather } from "./types";

const at = (day: Date, h: number, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);

interface Tpl {
  title: string;
  who: PersonId[];
  sh: number; sm?: number; eh: number; em?: number;
}
// Recurring by weekday (0 = Sunday)
const WEEKLY: Record<number, Tpl[]> = {
  1: [
    { title: "Soccer", who: ["kai"], sh: 16, eh: 17 },
    { title: "Swim", who: ["darcy"], sh: 17, sm: 30, eh: 18, em: 15 },
  ],
  2: [{ title: "Gymnastics", who: ["niko"], sh: 15, sm: 30, eh: 16, em: 30 }],
  3: [
    { title: "Newsletter send", who: ["mom"], sh: 9, eh: 10 },
    { title: "Swim", who: ["darcy"], sh: 17, sm: 30, eh: 18, em: 15 },
  ],
  4: [{ title: "Ceramics", who: ["darcy", "kai"], sh: 16, sm: 30, eh: 17, em: 30 }],
  6: [{ title: "Art class", who: ["nora"], sh: 10, eh: 11 }],
};

// One-offs as day offsets from today (canvas "today" = Mon Nov 16)
const ONE_OFFS: { off: number; title: string; who: PersonId[]; t?: [number, number, number, number] }[] = [
  { off: -16, title: "Halloween", who: ["family"], t: [17, 0, 20, 0] },
  { off: -10, title: "Pizza night", who: ["family"], t: [18, 0, 19, 30] },
  { off: -5, title: "Remembrance Day", who: ["family"] },
  { off: -4, title: "Dinner out", who: ["dad"], t: [19, 0, 21, 0] },
  { off: 0, title: "School drop-off", who: ["dad"], t: [8, 15, 8, 45] },
  { off: 0, title: "Client call", who: ["mom"], t: [13, 0, 13, 45] },
  { off: 0, title: "Playdate", who: ["nora"], t: [16, 15, 17, 30] },
  { off: 1, title: "Gym", who: ["dad"], t: [6, 0, 7, 0] },
  { off: 3, title: "Field trip", who: ["kai"], t: [9, 0, 14, 0] },
  { off: 4, title: "Movie night", who: ["family"], t: [19, 0, 21, 0] },
  { off: 5, title: "Hockey", who: ["dad"], t: [8, 0, 9, 30] },
  { off: 5, title: "Birthday party", who: ["darcy", "nora"], t: [14, 0, 16, 0] },
  { off: 6, title: "Brunch at Grandma’s", who: ["family"], t: [10, 30, 12, 30] },
  { off: 8, title: "Grandma’s birthday", who: ["family"] },
  { off: 11, title: "Pizza night", who: ["family"], t: [18, 0, 19, 30] },
  { off: 12, title: "Tree farm", who: ["family"], t: [11, 0, 13, 0] },
  { off: 19, title: "Light-up parade", who: ["family"], t: [18, 0, 20, 0] },
  { off: 32, title: "Last day of school", who: ["family"] },
  { off: 38, title: "Christmas Eve", who: ["family"] },
  { off: 39, title: "Christmas Day", who: ["family"] },
];

export function sampleEventsForDay(day: Date, today: Date): CalEvent[] {
  const out: CalEvent[] = [];
  const iso = day.toDateString();
  (WEEKLY[day.getDay()] ?? []).forEach((t, i) =>
    out.push({
      id: `w-${iso}-${i}`,
      title: t.title,
      who: t.who,
      start: at(day, t.sh, t.sm ?? 0),
      end: at(day, t.eh, t.em ?? 0),
      allDay: false,
    }),
  );
  ONE_OFFS.forEach((o, i) => {
    if (dayDiff(day, today) !== o.off) return;
    out.push({
      id: `o-${i}`,
      title: o.title,
      who: o.who,
      start: o.t ? at(day, o.t[0], o.t[1]) : startOfDay(day),
      end: o.t ? at(day, o.t[2], o.t[3]) : startOfDay(day),
      allDay: !o.t,
    });
  });
  return out;
}

export const sampleReminders: Reminder[] = [
  { id: "r1", text: "Sign Kai’s field trip form", due: "Wed", done: false },
  { id: "r2", text: "Library books", due: "Wed", done: false },
  { id: "r3", text: "Recycling out", due: "Tonight", done: false },
];

export const sampleGroceries: GroceryItem[] = ["Milk", "Tortillas", "Bananas", "Gnocchi", "Dish soap"].map(
  (text, i) => ({ id: `g${i}`, text, done: false }),
);

export function sampleMeals(today: Date): Meal[] {
  return [
    ["Sun", "Roast chicken & veg"],
    ["Mon", "Sheet-pan gnocchi & sausage"],
    ["Tue", "Taco Tuesday"],
    ["Wed", "Chicken noodle soup"],
    ["Thu", "Teriyaki salmon bowls"],
    ["Fri", "Homemade pizza"],
    ["Sat", "Burgers on the BBQ"],
  ].map(([day, meal], i) => ({ day, meal, isToday: today.getDay() === i }));
}

export function sampleBirthdays(today: Date): Birthday[] {
  return [
    { name: "Grandma", date: addDays(today, 8) },
    { name: "[Cousin’s name]", date: addDays(today, 16) },
  ].map((b) => ({ ...b, daysAway: dayDiff(b.date, today) }));
}

export const sampleWeather: Weather = { icon: "rain", temp: 9, label: "Light rain", high: 10, low: 6 };

export const isSameDay = sameDay;

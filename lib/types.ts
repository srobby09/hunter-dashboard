import type { PersonId } from "./people";

export type Repeat = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface CalEvent {
  id: string;
  title: string;
  who: PersonId[]; // never empty: ["family"] when untagged
  start: Date;
  end: Date;
  allDay: boolean;
  repeat?: Repeat;
}

export interface Reminder {
  id: string;
  text: string;
  due?: string; // display label: "Wed", "Tonight"
  done: boolean;
}

export interface GroceryItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Meal {
  day: string; // Mon..Fri
  meal: string;
  isToday: boolean;
}

export interface Birthday {
  name: string;
  date: Date;
  daysAway: number;
}

export interface Weather {
  icon: "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";
  temp: number;
  label: string;
  high: number;
  low: number;
}

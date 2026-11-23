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
  recurringId?: string; // set when this is one occurrence of a repeating event
  readOnly?: boolean; // birthdays: edited in Google Calendar
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
  empty?: boolean; // nothing planned
}

export interface Birthday {
  name: string;
  date: Date;
  daysAway: number;
}

export interface ForecastDay {
  date: string; // YYYY-MM-DD
  icon: Weather["icon"];
  label: string;
  high: number;
  low: number;
}

export interface Weather {
  forecast?: ForecastDay[]; // the next three days
  icon: "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm";
  temp: number;
  label: string;
  high: number;
  low: number;
}

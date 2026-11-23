"use client";
// All the data the dashboard shows, loaded and kept fresh in one place so the wall and phone layouts share it.
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, dayKey, startOfDay, startOfWeek } from "./dates";
import { readCache, writeCache } from "./cache";
import type { EditInput, Scope } from "./eventEdit";
import type { NewEventInput } from "./eventPayload";
import type { PersonId } from "./people";
import type { MealDay } from "./pickle";
import { createGoogleReminders } from "./reminders";
import { BIRTHDAY_WINDOW_DAYS } from "./reminderUtils";
import type { CalEvent, GroceryItem, Reminder, Weather } from "./types";

interface ApiEvent { id: string; title: string; who: PersonId[]; start: string; end: string; allDay: boolean; recurringId?: string; readOnly?: boolean }
export const localDate = (s: string) => (s.length === 10 ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : new Date(s));
const fromApi = (e: ApiEvent): CalEvent => ({ ...e, start: localDate(e.start), end: localDate(e.end) });

export function useDashboardData(now: Date | null, anchor: Date | null) {
  const provider = useMemo(() => createGoogleReminders(), []);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calError, setCalError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remError, setRemError] = useState<string | null>(null); // a load problem (expired login...) or "save"
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [groceryError, setGroceryError] = useState<string | null>(null); // a Pickle problem code, or "save"
  const [mealDays, setMealDays] = useState<MealDay[]>([]);
  const [mealsError, setMealsError] = useState<string | null>(null);
  const [mealsHome, setMealsHome] = useState<string | null>(null);
  const [birthdayList, setBirthdayList] = useState<{ name: string; date: string }[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); // when the calendar was last read successfully

  // Each loader registers here so everything can be refreshed at once (pull-to-refresh, coming back to the app)
  const loaders = useRef<Record<string, () => Promise<unknown>>>({});
  const refreshAll = () => Promise.allSettled(Object.values(loaders.current).map((f) => f()));

  // Events from Hunter Family and Hunter Birthdays: now, every 3 minutes, and when the month changes
  const monthKey = anchor ? `${anchor.getFullYear()}-${anchor.getMonth()}` : null;
  useEffect(() => {
    if (!anchor) return;
    const from = addDays(new Date(anchor.getFullYear(), anchor.getMonth(), 1), -8);
    const to = addDays(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1), 15);
    let live = true;
    // Show the last good events straight away (useful after a reload with a bad connection)
    const cached = readCache<{ monthKey: string; events: ApiEvent[] }>("events");
    if (cached && cached.v.monthKey === monthKey) { setEvents(cached.v.events.map(fromApi)); setLastUpdated(new Date(cached.t)); }
    const load = () =>
      fetch(`/api/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!live) return;
          if (!r.ok) { setCalError(j.error ?? "calendar_error"); return; } // keep showing the last good events
          setEvents(j.events.map(fromApi));
          setCalError(null);
          setLastUpdated(new Date());
          writeCache("events", { monthKey, events: j.events });
        })
        .catch(() => { if (live) setCalError("offline"); });
    loaders.current.events = load;
    load();
    const t = setInterval(load, 3 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  // Reminders from the Hunter Reminders list in Google Tasks: now and every 3 minutes
  useEffect(() => {
    const cached = readCache<Reminder[]>("reminders");
    if (cached) setReminders(cached.v);
    const load = () => provider.listReminders().then((r) => { setReminders(r); setRemError(null); writeCache("reminders", r); }).catch((e: Error) => setRemError(e.message));
    loaders.current.reminders = load;
    load();
    const t = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [provider]);

  // Meals for the current week (Sunday start) from Pickle: now, every 10 minutes, and when the week changes
  const weekKey = now ? dayKey(startOfWeek(now)) : null;
  useEffect(() => {
    if (!weekKey) return;
    let live = true;
    const cached = readCache<{ weekKey: string; days: MealDay[]; home: string | null }>("meals");
    if (cached && cached.v.weekKey === weekKey) { setMealDays(cached.v.days); setMealsHome(cached.v.home); }
    const load = () =>
      fetch(`/api/meals?week=${weekKey}`, { cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!live) return;
          if (!r.ok) { setMealsError(j.error ?? "pickle_unreachable"); return; } // keep the last meals on screen
          const home = typeof j.home === "string" ? j.home : null;
          setMealDays(j.days);
          setMealsHome(home);
          setMealsError(null);
          writeCache("meals", { weekKey, days: j.days, home });
        })
        .catch(() => { if (live) setMealsError("pickle_unreachable"); });
    loaders.current.meals = load;
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
  }, [weekKey]);

  // The To get list from Pickle: now and every 3 minutes
  useEffect(() => {
    const cached = readCache<GroceryItem[]>("groceries");
    if (cached) setGroceries(cached.v);
    const load = () =>
      fetch("/api/groceries", { cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) { setGroceryError(j.error ?? "pickle_unreachable"); return; }
          const items: GroceryItem[] = j.items.map((i: { id: string; name: string; done: boolean }) => ({ id: i.id, text: i.name, done: i.done }));
          setGroceries(items);
          setGroceryError(null);
          writeCache("groceries", items);
        })
        .catch(() => setGroceryError("pickle_unreachable"));
    loaders.current.groceries = load;
    load();
    const t = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Upcoming birthdays from the Hunter Birthdays calendar: now and hourly
  useEffect(() => {
    const cached = readCache<{ name: string; date: string }[]>("birthdays");
    if (cached) setBirthdayList(cached.v);
    const load = () => {
      const from = startOfDay(new Date());
      const to = addDays(from, BIRTHDAY_WINDOW_DAYS + 1);
      return fetch(`/api/birthdays?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j) { setBirthdayList(j.birthdays); writeCache("birthdays", j.birthdays); } })
        .catch(() => {});
    };
    loaders.current.birthdays = load;
    load();
    const t = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Weather from Open-Meteo (through our server), every 30 minutes; keeps the last reading if a refresh fails
  useEffect(() => {
    const cached = readCache<Weather>("weather");
    if (cached) setWeather(cached.v);
    const load = () => fetch("/api/weather").then((r) => (r.ok ? r.json() : null)).then((w) => { if (w) { setWeather(w); writeCache("weather", w); } }).catch(() => {});
    loaders.current.weather = load;
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // A failed save shows briefly
  useEffect(() => {
    if (remError !== "save") return;
    const t = setTimeout(() => setRemError(null), 6000);
    return () => clearTimeout(t);
  }, [remError]);
  useEffect(() => {
    if (groceryError !== "save") return;
    const t = setTimeout(() => setGroceryError(null), 6000);
    return () => clearTimeout(t);
  }, [groceryError]);

  // Turns a failed event save into a sentence for the sheet
  const eventError = async (r: Response): Promise<string> => {
    const { error } = (await r.json().catch(() => ({}))) as { error?: string };
    if (error === "expired" || error === "not_connected") return "Google login expired. Reconnect in Settings, then try again.";
    if (error === "end_before_start") return "The end time needs to be after the start time.";
    if (error === "event_not_found") return "That event is gone from the calendar. It may have been changed or deleted elsewhere.";
    if (error === "calendar_error" || error === "calendar_not_found" || error === "google_error") return "Google Calendar didn't accept that. Please try again.";
    return "Couldn't save the event. Please try again.";
  };
  const NO_CONNECTION = "Couldn't reach the calendar. Check the connection and try again.";
  const send = async (url: string, method: string, body?: unknown): Promise<string | null> => {
    try {
      const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) return eventError(r);
      await loaders.current.events?.();
      return null;
    } catch {
      return NO_CONNECTION;
    }
  };

  // Save a new event to Hunter Family; returns an error message, or null on success
  const saveEvent = (input: NewEventInput) => send("/api/calendar/events", "POST", input);
  // Change or delete an existing event (scope: just this one, or the whole repeating series)
  const updateEvent = (id: string, input: EditInput) => send(`/api/calendar/events/${encodeURIComponent(id)}`, "PATCH", input);
  const deleteEvent = (id: string, scope: Scope) => send(`/api/calendar/events/${encodeURIComponent(id)}?scope=${scope}`, "DELETE");

  const toggleReminder = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (!r || id.startsWith("tmp-")) return;
    setReminders(reminders.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    provider.completeReminder(id, !r.done).catch(() => { setReminders((cur) => cur.map((x) => (x.id === id ? { ...x, done: r.done } : x))); setRemError("save"); });
  };
  const addReminder = (text: string) => {
    const tmp = `tmp-${Date.now()}`;
    setReminders((cur) => [...cur, { id: tmp, text, done: false }]);
    provider.addReminder(text)
      .then((r) => setReminders((cur) => cur.map((x) => (x.id === tmp ? r : x))))
      .catch(() => { setReminders((cur) => cur.filter((x) => x.id !== tmp)); setRemError("save"); });
  };

  const toggleGrocery = (id: string) => {
    const g = groceries.find((x) => x.id === id);
    if (!g || id.startsWith("tmp-")) return;
    setGroceries(groceries.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    fetch(`/api/groceries/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !g.done }) })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => { setGroceries((cur) => cur.map((x) => (x.id === id ? { ...x, done: g.done } : x))); setGroceryError("save"); });
  };
  const addGrocery = (text: string) => {
    const tmp = `tmp-${Date.now()}`;
    setGroceries((cur) => [...cur, { id: tmp, text, done: false }]);
    fetch("/api/groceries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: text }) })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j: { item: { id: string; name: string; done: boolean } }) => setGroceries((cur) => (cur.some((x) => x.id === j.item.id) ? cur.filter((x) => x.id !== tmp) : cur.map((x) => (x.id === tmp ? { id: j.item.id, text: j.item.name, done: j.item.done } : x)))))
      .catch(() => { setGroceries((cur) => cur.filter((x) => x.id !== tmp)); setGroceryError("save"); });
  };

  return {
    events, calError, saveEvent, updateEvent, deleteEvent,
    reminders, remError, toggleReminder, addReminder,
    groceries, groceryError, toggleGrocery, addGrocery,
    mealDays, mealsError, mealsHome,
    birthdayList, weather, lastUpdated, refreshAll,
  };
}
export type DashboardData = ReturnType<typeof useDashboardData>;

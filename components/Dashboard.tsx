"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, dayDiff, dayKey, sameDay, startOfDay, startOfWeek } from "@/lib/dates";
import { createGoogleReminders } from "@/lib/reminders";
import { nextBirthdays } from "@/lib/reminderUtils";
import { isMultiDay } from "@/lib/spans";
import { toMeals } from "@/lib/mealUtils";
import type { NewEventInput } from "@/lib/eventPayload";
import type { PersonId } from "@/lib/people";
import type { MealDay } from "@/lib/pickle";
import type { Birthday, CalEvent, GroceryItem, Reminder, Weather } from "@/lib/types";
import AddEventSheet from "./AddEventSheet";
import Aside from "./Aside";
import DayPanel from "./DayPanel";
import { type View } from "./Common";
import Header from "./Header";
import MonthPanel from "./MonthPanel";
import WeekPanel from "./WeekPanel";

const IDLE_MS = 2 * 60 * 1000;

interface ApiEvent { id: string; title: string; who: PersonId[]; start: string; end: string; allDay: boolean }
const localDate = (s: string) => (s.length === 10 ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : new Date(s));
const fromApi = (e: ApiEvent): CalEvent => ({ ...e, start: localDate(e.start), end: localDate(e.end) });

export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [sheet, setSheet] = useState(false);
  const provider = useMemo(() => createGoogleReminders(), []);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remError, setRemError] = useState<string | null>(null); // load problems (expired login...) or a failed save
  const [birthdayList, setBirthdayList] = useState<{ name: string; date: string }[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [groceryError, setGroceryError] = useState<string | null>(null); // a Pickle problem code, or "save"
  const [mealDays, setMealDays] = useState<MealDay[]>([]);
  const [mealsError, setMealsError] = useState<string | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clock (client-only to avoid hydration mismatch)
  useEffect(() => {
    const n = new Date();
    setNow(n);
    setAnchor(startOfDay(n));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Reminders from the Hunter Reminders list in Google Tasks: now and every 3 minutes
  useEffect(() => {
    const load = () => provider.listReminders().then((r) => { setReminders(r); setRemError(null); }).catch((e: Error) => setRemError(e.message));
    load();
    const t = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [provider]);

  // Meals for the current week (Sunday start) from Pickle: now, every 10 minutes, and when the week changes
  const weekKey = now ? dayKey(startOfWeek(now)) : null;
  useEffect(() => {
    if (!weekKey) return;
    let live = true;
    const load = () =>
      fetch(`/api/meals?week=${weekKey}`, { cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!live) return;
          if (!r.ok) { setMealsError(j.error ?? "pickle_unreachable"); return; } // keep the last meals on screen
          setMealDays(j.days);
          setMealsError(null);
        })
        .catch(() => { if (live) setMealsError("pickle_unreachable"); });
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
  }, [weekKey]);

  // The To get list from Pickle: now and every 3 minutes
  useEffect(() => {
    const load = () =>
      fetch("/api/groceries", { cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) { setGroceryError(j.error ?? "pickle_unreachable"); return; }
          setGroceries(j.items.map((i: { id: string; name: string; done: boolean }) => ({ id: i.id, text: i.name, done: i.done })));
          setGroceryError(null);
        })
        .catch(() => setGroceryError("pickle_unreachable"));
    load();
    const t = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (groceryError !== "save") return;
    const t = setTimeout(() => setGroceryError(null), 6000);
    return () => clearTimeout(t);
  }, [groceryError]);

  // Upcoming birthdays from the Hunter Birthdays calendar: now and hourly
  useEffect(() => {
    const load = () => {
      const from = startOfDay(new Date());
      const to = addDays(from, 400);
      fetch(`/api/birthdays?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j) setBirthdayList(j.birthdays); })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // A failed save shows briefly in the Reminders card
  useEffect(() => {
    if (remError !== "save") return;
    const t = setTimeout(() => setRemError(null), 6000);
    return () => clearTimeout(t);
  }, [remError]);

  const today = useMemo(() => (now ? startOfDay(now) : null), [now?.getFullYear(), now?.getMonth(), now?.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Return to Week, on today, after 2 minutes with no touches
  const resetIdle = useCallback(() => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      setView("week"); setSheet(false); setAnchor(startOfDay(new Date()));
    }, IDLE_MS);
  }, []);
  useEffect(() => {
    const evs = ["pointerdown", "touchstart", "keydown"] as const;
    evs.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => { evs.forEach((e) => window.removeEventListener(e, resetIdle)); if (idle.current) clearTimeout(idle.current); };
  }, [resetIdle]);

  // Real events from Hunter Family, re-read every few minutes and when the month changes
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calError, setCalError] = useState<string | null>(null);
  const reload = useRef<() => Promise<void>>(async () => {});
  const monthKey = anchor ? `${anchor.getFullYear()}-${anchor.getMonth()}` : null;
  useEffect(() => {
    if (!anchor) return;
    const from = addDays(new Date(anchor.getFullYear(), anchor.getMonth(), 1), -8);
    const to = addDays(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1), 15);
    let live = true;
    const load = () =>
      fetch(`/api/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`, { cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!live) return;
          if (!r.ok) { setCalError(j.error ?? "calendar_error"); return; } // keep showing the last good events
          setEvents(j.events.map(fromApi));
          setCalError(null);
        })
        .catch(() => { if (live) setCalError("offline"); });
    reload.current = load;
    load();
    const t = setInterval(load, 3 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  // Weather from Open-Meteo (through our server), every 30 minutes; keeps the last reading if a refresh fails
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/weather").then((r) => (r.ok ? r.json() : null)).then((w) => w && setWeather(w)).catch(() => {});
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Save a new event to Hunter Family; returns an error message, or null on success
  const saveEvent = async (input: NewEventInput): Promise<string | null> => {
    try {
      const r = await fetch("/api/calendar/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!r.ok) {
        const { error } = (await r.json().catch(() => ({}))) as { error?: string };
        if (error === "expired" || error === "not_connected") return "Google login expired. Reconnect in Settings, then try again.";
        if (error === "end_before_start") return "The end time needs to be after the start time.";
        if (error === "calendar_error" || error === "calendar_not_found") return "Google Calendar didn't accept that. Please try again.";
        return "Couldn't save the event. Please try again.";
      }
      await reload.current();
      setSheet(false);
      return null;
    } catch {
      return "Couldn't reach the calendar. Check the connection and try again.";
    }
  };

  if (!now || !today || !anchor) return <div className="app" />;

  const eventsFor = (d: Date): CalEvent[] => {
    const dayStart = startOfDay(d).getTime();
    const dayEnd = dayStart + 86400000;
    const real = events.filter((e) => e.start.getTime() < dayEnd && e.end.getTime() > dayStart || (e.start.getTime() === e.end.getTime() && sameDay(e.start, d)));
    return real.sort((a, b) => (a.allDay === b.allDay ? a.start.getTime() - b.start.getTime() : a.allDay ? -1 : 1));
  };

  const problem = calError ?? (remError && remError !== "save" ? remError : null);
  const notice = problem === "expired" ? "Google login expired · tap to reconnect"
    : problem === "not_connected" || problem === "not_configured" ? "Google not connected · tap to set up"
    : calError ? "Calendar can't be reached · showing last update" : null;

  const birthdays: Birthday[] = nextBirthdays(birthdayList, 2).map((b) => {
    const date = localDate(b.date);
    return { name: b.name, date, daysAway: dayDiff(date, today) };
  });

  const multi = events.filter(isMultiDay);

  const step = (days: number) => setAnchor(addDays(anchor, days));
  const stepMonth = (n: number) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));
  const goToday = () => setAnchor(today);
  const openDay = (d: Date) => { setAnchor(d); setView("day"); };
  const month = view === "month";

  return (
    <div className="app">
      <Header now={now} weather={weather} notice={notice} />
      <div className="body">
        <div className="main">
          {view === "week" && <WeekPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} eventsFor={eventsFor} multi={multi} onStep={step} onToday={goToday} onOpenDay={openDay} />}
          {view === "day" && <DayPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} events={eventsFor(anchor)} onStep={step} onToday={goToday} />}
          {month && <MonthPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} eventsFor={eventsFor} multi={multi} onStep={stepMonth} onToday={goToday} onOpenDay={openDay} />}
        </div>
        {!month && (
          <Aside
            reminders={reminders}
            reminderError={remError === "save" ? "Couldn't save that. Please try again." : null}
            onToggleReminder={(id) => {
              const r = reminders.find((x) => x.id === id); if (!r || id.startsWith("tmp-")) return;
              setReminders(reminders.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
              provider.completeReminder(id, !r.done).catch(() => { setReminders((cur) => cur.map((x) => (x.id === id ? { ...x, done: r.done } : x))); setRemError("save"); });
            }}
            onAddReminder={(text) => {
              const tmp = `tmp-${Date.now()}`;
              setReminders((cur) => [...cur, { id: tmp, text, done: false }]);
              provider.addReminder(text)
                .then((r) => setReminders((cur) => cur.map((x) => (x.id === tmp ? r : x))))
                .catch(() => { setReminders((cur) => cur.filter((x) => x.id !== tmp)); setRemError("save"); });
            }}
            meals={toMeals(mealDays, today)}
            mealsError={mealsError}
            groceries={groceries}
            groceryError={groceryError}
            onToggleGrocery={(id) => {
              const g = groceries.find((x) => x.id === id); if (!g || id.startsWith("tmp-")) return;
              setGroceries(groceries.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
              fetch(`/api/groceries/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !g.done }) })
                .then((r) => { if (!r.ok) throw new Error(); })
                .catch(() => { setGroceries((cur) => cur.map((x) => (x.id === id ? { ...x, done: g.done } : x))); setGroceryError("save"); });
            }}
            onAddGrocery={(text) => {
              const tmp = `tmp-${Date.now()}`;
              setGroceries((cur) => [...cur, { id: tmp, text, done: false }]);
              fetch("/api/groceries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: text }) })
                .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
                .then((j: { item: { id: string; name: string; done: boolean } }) => setGroceries((cur) => (cur.some((x) => x.id === j.item.id) ? cur.filter((x) => x.id !== tmp) : cur.map((x) => (x.id === tmp ? { id: j.item.id, text: j.item.name, done: j.item.done } : x)))))
                .catch(() => { setGroceries((cur) => cur.filter((x) => x.id !== tmp)); setGroceryError("save"); });
            }}
            birthdays={birthdays}
          />
        )}
      </div>
      {sheet && <AddEventSheet today={today} initialDate={view === "month" ? today : anchor} onClose={() => setSheet(false)} onSave={saveEvent} />}
    </div>
  );
}

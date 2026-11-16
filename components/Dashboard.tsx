"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, sameDay, startOfDay } from "@/lib/dates";
import { createSampleReminders } from "@/lib/reminders";
import { sampleBirthdays, sampleEventsForDay, sampleGroceries, sampleMeals, sampleWeather } from "@/lib/sample";
import type { CalEvent, GroceryItem, Reminder } from "@/lib/types";
import AddEventSheet from "./AddEventSheet";
import Aside from "./Aside";
import DayPanel from "./DayPanel";
import { type View } from "./Common";
import Header from "./Header";
import MonthPanel from "./MonthPanel";
import WeekPanel from "./WeekPanel";

const IDLE_MS = 2 * 60 * 1000;

function matchesRepeat(e: CalEvent, d: Date): boolean {
  const s = e.start;
  if (startOfDay(d) <= startOfDay(s) || !e.repeat || e.repeat === "none") return false;
  switch (e.repeat) {
    case "daily": return true;
    case "weekly": return d.getDay() === s.getDay();
    case "monthly": return d.getDate() === s.getDate();
    case "yearly": return d.getDate() === s.getDate() && d.getMonth() === s.getMonth();
  }
}

export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [added, setAdded] = useState<CalEvent[]>([]);
  const [sheet, setSheet] = useState(false);
  const provider = useMemo(() => createSampleReminders(), []);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>(sampleGroceries);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clock (client-only to avoid hydration mismatch)
  useEffect(() => {
    const n = new Date();
    setNow(n);
    setAnchor(startOfDay(n));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { provider.listReminders().then(setReminders); }, [provider]);

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

  if (!now || !today || !anchor) return <div className="app" />;

  const eventsFor = (d: Date): CalEvent[] => {
    const extra = added.filter((e) => sameDay(e.start, d) || matchesRepeat(e, d)).map((e) =>
      sameDay(e.start, d) ? e : { ...e, id: `${e.id}-${d.toDateString()}`, start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), e.start.getHours(), e.start.getMinutes()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), e.end.getHours(), e.end.getMinutes()) });
    return [...sampleEventsForDay(d, today), ...extra].sort((a, b) => (a.allDay === b.allDay ? a.start.getTime() - b.start.getTime() : a.allDay ? -1 : 1));
  };

  const step = (days: number) => setAnchor(addDays(anchor, days));
  const stepMonth = (n: number) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));
  const goToday = () => setAnchor(today);
  const openDay = (d: Date) => { setAnchor(d); setView("day"); };
  const month = view === "month";

  return (
    <div className="app">
      <Header now={now} weather={sampleWeather} />
      <div className="body">
        <div className="main">
          {view === "week" && <WeekPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} eventsFor={eventsFor} onStep={step} onToday={goToday} onOpenDay={openDay} />}
          {view === "day" && <DayPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} events={eventsFor(anchor)} onStep={step} onToday={goToday} />}
          {month && <MonthPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} eventsFor={eventsFor} onStep={stepMonth} onToday={goToday} onOpenDay={openDay} />}
        </div>
        {!month && (
          <Aside
            reminders={reminders}
            onToggleReminder={(id) => {
              const r = reminders.find((x) => x.id === id); if (!r) return;
              setReminders(reminders.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
              provider.completeReminder(id, !r.done);
            }}
            onAddReminder={(t) => provider.addReminder(t).then((r) => setReminders((cur) => [...cur, r]))}
            meals={sampleMeals(today)}
            groceries={groceries}
            onToggleGrocery={(id) => setGroceries(groceries.map((g) => (g.id === id ? { ...g, done: !g.done } : g)))}
            onAddGrocery={(t) => setGroceries([...groceries, { id: `g${Date.now()}`, text: t, done: false }])}
            birthdays={sampleBirthdays(today)}
          />
        )}
      </div>
      {sheet && <AddEventSheet today={today} initialDate={view === "month" ? today : anchor} onClose={() => setSheet(false)} onSave={(e) => { setAdded((a) => [...a, e]); setSheet(false); }} />}
    </div>
  );
}

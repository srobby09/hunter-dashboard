"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, dayDiff, startOfDay } from "@/lib/dates";
import { eventsOnDay } from "@/lib/dayEvents";
import { BIRTHDAY_WINDOW_DAYS, nextBirthdays } from "@/lib/reminderUtils";
import { isMultiDay } from "@/lib/spans";
import { toMeals } from "@/lib/mealUtils";
import { localDate, useDashboardData } from "@/lib/useDashboardData";
import type { Birthday } from "@/lib/types";
import AddEventSheet from "./AddEventSheet";
import Aside from "./Aside";
import DayPanel from "./DayPanel";
import { type View } from "./Common";
import Header from "./Header";
import MonthPanel from "./MonthPanel";
import WeekPanel from "./WeekPanel";

const IDLE_MS = 2 * 60 * 1000;

export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [sheet, setSheet] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const data = useDashboardData(now, anchor);

  // Clock (client-only to avoid hydration mismatch)
  useEffect(() => {
    const n = new Date();
    setNow(n);
    setAnchor(startOfDay(n));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  const eventsFor = (d: Date) => eventsOnDay(data.events, d);

  const { calError, remError } = data;
  const problem = calError ?? (remError && remError !== "save" ? remError : null);
  const notice = problem === "expired" ? "Google login expired · tap to reconnect"
    : problem === "not_connected" || problem === "not_configured" ? "Google not connected · tap to set up"
    : calError ? "Calendar can't be reached · showing last update" : null;

  // Every birthday in the next 30 days, soonest first
  const birthdays: Birthday[] = nextBirthdays(data.birthdayList, Infinity)
    .map((b) => {
      const date = localDate(b.date);
      return { name: b.name, date, daysAway: dayDiff(date, today) };
    })
    .filter((b) => b.daysAway >= 0 && b.daysAway <= BIRTHDAY_WINDOW_DAYS);

  const multi = data.events.filter(isMultiDay);

  const step = (days: number) => setAnchor(addDays(anchor, days));
  const stepMonth = (n: number) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));
  const goToday = () => setAnchor(today);
  const openDay = (d: Date) => { setAnchor(d); setView("day"); };
  const month = view === "month";

  return (
    <div className="app">
      <Header now={now} weather={data.weather} notice={notice} />
      <div className="body">
        <div className="main">
          {view === "week" && <WeekPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} eventsFor={eventsFor} multi={multi} onStep={step} onToday={goToday} onOpenDay={openDay} />}
          {view === "day" && <DayPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} events={eventsFor(anchor)} onStep={step} onToday={goToday} />}
          {month && <MonthPanel view={view} onView={setView} onAdd={() => setSheet(true)} anchor={anchor} today={today} eventsFor={eventsFor} multi={multi} onStep={stepMonth} onToday={goToday} onOpenDay={openDay} />}
        </div>
        {!month && (
          <Aside
            reminders={data.reminders}
            reminderError={remError === "save" ? "Couldn't save that. Please try again." : null}
            onToggleReminder={data.toggleReminder}
            onAddReminder={data.addReminder}
            meals={toMeals(data.mealDays, today)}
            mealsError={data.mealsError}
            groceries={data.groceries}
            groceryError={data.groceryError}
            onToggleGrocery={data.toggleGrocery}
            onAddGrocery={data.addGrocery}
            birthdays={birthdays}
          />
        )}
      </div>
      {sheet && <AddEventSheet today={today} initialDate={view === "month" ? today : anchor} onClose={() => setSheet(false)} onSave={async (input) => { const msg = await data.saveEvent(input); if (!msg) setSheet(false); return msg; }} />}
    </div>
  );
}

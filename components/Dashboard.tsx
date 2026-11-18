"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, dayDiff, startOfDay } from "@/lib/dates";
import { eventsOnDay } from "@/lib/dayEvents";
import { isAsleep, nightActive, WAKE_MS } from "@/lib/night";
import { dataNotice } from "@/lib/notice";
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
import NightScreen from "./NightScreen";
import MonthPanel from "./MonthPanel";
import WeekPanel from "./WeekPanel";

const IDLE_MS = 2 * 60 * 1000;

export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [sheet, setSheet] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wakeUntil, setWakeUntil] = useState(0); // night mode: the screen is awake until this time
  const [force] = useState(() => new URLSearchParams(window.location.search).get("night")); // ?night=on / off, for testing
  const pageStart = useRef(Date.now());
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

  // Night mode: black from 11 PM to 6 AM, awake for a minute after each touch
  const night = now ? nightActive(now, force) : false;
  const asleep = now ? isAsleep(night, now.getTime(), wakeUntil) : false;
  useEffect(() => {
    if (!night) return;
    const extend = () => setWakeUntil((w) => (Date.now() < w ? Date.now() + WAKE_MS : w)); // touches keep it awake; the black screen's own tap wakes it
    window.addEventListener("pointerdown", extend, { passive: true });
    return () => window.removeEventListener("pointerdown", extend);
  }, [night]);
  useEffect(() => {
    if (!asleep) return;
    setView("week"); setSheet(false); setAnchor(startOfDay(new Date())); // wake up to this week
  }, [asleep]);
  // Once a night, at 4 AM, reload so a long-running page picks up any new version
  useEffect(() => {
    if (asleep && now && now.getHours() === 4 && now.getMinutes() === 0 && Date.now() - pageStart.current > 6 * 3600 * 1000) window.location.reload();
  }, [asleep, now]);

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

  const { remError } = data;
  const notice = dataNotice({ calError: data.calError, remError, lastUpdated: data.lastUpdated, now });

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
      {asleep && <NightScreen onWake={() => setWakeUntil(Date.now() + WAKE_MS)} />}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { startOfDay } from "@/lib/dates";
import { openCount } from "@/lib/mobile";
import { dataNotice } from "@/lib/notice";
import { useDashboardData } from "@/lib/useDashboardData";
import AddEventSheet from "../AddEventSheet";
import CalendarTab from "./CalendarTab";
import { CalendarIcon, ListIcon, MealIcon } from "./Icons";
import ListsTab from "./ListsTab";
import MealsTab from "./MealsTab";

type Tab = "calendar" | "lists" | "meals";
const TABS: { id: Tab; label: string; Icon: () => React.ReactElement }[] = [
  { id: "calendar", label: "Calendar", Icon: CalendarIcon },
  { id: "lists", label: "Lists", Icon: ListIcon },
  { id: "meals", label: "Meals", Icon: MealIcon },
];
const TAB_KEY = "hunter-tab";
const firstOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export default function MobileApp() {
  const [now, setNow] = useState(() => new Date());
  const today = useMemo(() => startOfDay(now), [now.getFullYear(), now.getMonth(), now.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<Tab>(() => {
    try { const t = localStorage.getItem(TAB_KEY); return t === "lists" || t === "meals" ? t : "calendar"; } catch { return "calendar"; }
  });
  const [month, setMonth] = useState(() => firstOf(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [sheet, setSheet] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const data = useDashboardData(now, month);

  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch { /* private mode */ } }, [tab]);

  // Cream background all the way to the edges while the phone layout is showing
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#FBFAF5";
    return () => { document.body.style.background = prev; };
  }, []);

  // Keep the clock current and refresh when the app comes back to the foreground
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    const onVisible = () => { if (!document.hidden) { setNow(new Date()); data.refreshAll(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [data]);

  // Keep the add box above the on-screen keyboard: size the app to the visible area
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      const el = root.current;
      if (!el) return;
      el.style.setProperty("--vvh", `${vv.height}px`);
      el.style.setProperty("--vvt", `${vv.offsetTop}px`);
      setKeyboard(window.innerHeight - vv.height > 120);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); };
  }, []);

  const go = (delta: number) => {
    const m = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(m);
    setSelected(m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth() ? today : m);
  };
  const goToday = () => { setMonth(firstOf(today)); setSelected(today); };

  const notice = dataNotice({ calError: data.calError, remError: data.remError, lastUpdated: data.lastUpdated, now });

  const badge = openCount([data.groceries, data.reminders]);

  return (
    <div ref={root} className={`m-app${keyboard ? " kb" : ""}`}>
      <div className="m-body">
        {tab === "calendar" && <CalendarTab data={data} today={today} month={month} selected={selected} onSelect={setSelected} onStep={go} onToday={goToday} onAdd={() => setSheet(true)} notice={notice} />}
        {tab === "lists" && <ListsTab data={data} />}
        {tab === "meals" && <MealsTab data={data} today={today} />}
      </div>
      <nav className="m-tabs" aria-label="Main">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-current={tab === id ? "page" : undefined} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            <span className="ic"><Icon />{id === "lists" && badge > 0 && <span className="badge" aria-label={`${badge} open`}>{badge > 99 ? "99+" : badge}</span>}</span>
            <span className="lb">{label}</span>
          </button>
        ))}
      </nav>
      {sheet && (
        <AddEventSheet today={today} initialDate={selected} onClose={() => setSheet(false)}
          onSave={async (input) => { const msg = await data.saveEvent(input); if (!msg) setSheet(false); return msg; }} />
      )}
    </div>
  );
}

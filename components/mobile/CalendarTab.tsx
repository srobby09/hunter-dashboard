"use client";
import { useRef } from "react";
import { DOW, sameDay, longLabel } from "@/lib/dates";
import { eventsOnDay } from "@/lib/dayEvents";
import { agendaTime, barColors, joinNames, monthDays } from "@/lib/mobile";
import type { DashboardData } from "@/lib/useDashboardData";
import { Dots, isFamily } from "../Common";
import { ChevronL, ChevronR, PlusIcon, TodayIcon } from "./Icons";
import PullScroll from "./PullScroll";

/** The colour bar at the left of an event: one stacked segment per owner. */
const Bar = ({ who }: { who: Parameters<typeof barColors>[0] }) => (
  <i className="m-bar" aria-hidden="true">{barColors(who).map((c, i) => <b key={i} style={{ background: c }} />)}</i>
);

export default function CalendarTab({ data, today, month, selected, onSelect, onStep, onToday, onAdd, notice }: {
  data: DashboardData; today: Date; month: Date; selected: Date;
  onSelect: (d: Date) => void; onStep: (n: number) => void; onToday: () => void; onAdd: () => void; notice: string | null;
}) {
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const days = monthDays(month);
  const agenda = eventsOnDay(data.events, selected);
  const label = month.toLocaleDateString("en-US", { month: "short" }).toUpperCase();

  return (
    <div className="m-tab">
      {notice && <a className="m-notice" href="/settings">{notice}</a>}
      <header className="m-cal-head">
        <h1 aria-label={month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}>
          {label}{month.getFullYear() !== today.getFullYear() && <small>{month.getFullYear()}</small>}
        </h1>
        <div className="m-arrows">
          <button type="button" aria-label="Previous month" onClick={() => onStep(-1)}><ChevronL /></button>
          <button type="button" aria-label="Next month" onClick={() => onStep(1)}><ChevronR /></button>
        </div>
        <div className="m-head-right">
          <button type="button" className="m-today" onClick={onToday}><TodayIcon />TODAY</button>
          <button type="button" className="m-fab" aria-label="Add event" onClick={onAdd}><PlusIcon /></button>
        </div>
      </header>

      <div className="m-dow" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div
        className="m-grid"
        onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const s = swipe.current; swipe.current = null;
          if (!s) return;
          const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dy) < 40) onStep(dx < 0 ? 1 : -1);
        }}
      >
        {days.map((d) => {
          const evs = eventsOnDay(data.events, d);
          const sel = sameDay(d, selected);
          const isToday = sameDay(d, today);
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button key={d.getTime()} type="button" aria-pressed={sel}
              className={`m-cell${sel ? " sel" : isToday ? " today" : ""}${inMonth ? "" : " dim"}`}
              aria-label={`${longLabel(d)}${evs.length ? `, ${evs.length} ${evs.length === 1 ? "event" : "events"}` : ""}`}
              onClick={() => onSelect(d)}>
              <span className="n">{d.getDate()}</span>
              {evs.slice(0, 2).map((e) => (
                <span key={e.id} className="m-ev"><Bar who={e.who} /><span className="t">{e.title}</span></span>
              ))}
              {evs.length > 2 && <span className="m-more">+{evs.length - 2}</span>}
            </button>
          );
        })}
      </div>

      <PullScroll className="m-agenda" onRefresh={data.refreshAll}>
        <h2>{selected.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</h2>
        {agenda.length === 0 && <p className="m-empty">Nothing on the calendar.</p>}
        <ul>
          {agenda.map((e) => {
            const t = agendaTime(e);
            return (
              <li key={e.id} className="m-card">
                <div className="tm">
                  {t.allDay ? <span className="allday">All day</span> : (<><span className="s">{t.start}<small>{t.startAp}</small></span><span className="e">{t.end}</span></>)}
                </div>
                <Bar who={e.who} />
                <div className="tx">
                  <b>{e.title}</b>
                  <span className="m-who">{!isFamily(e.who) && <Dots who={e.who} size={18} />}{joinNames(e.who)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </PullScroll>
    </div>
  );
}

export { DOW };

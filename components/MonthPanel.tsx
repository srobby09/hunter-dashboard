import { DOW, addDays, fmtShort, longLabel, sameDay, startOfWeek } from "@/lib/dates";
import { eventBg } from "@/lib/people";
import type { CalEvent } from "@/lib/types";
import { Dots, Nav, ViewToggle, type View } from "./Common";

export default function MonthPanel({ view, onView, onAdd, anchor, today, eventsFor, onStep, onToday, onOpenDay }: {
  view: View; onView: (v: View) => void; onAdd: () => void;
  anchor: Date; today: Date; eventsFor: (d: Date) => CalEvent[];
  onStep: (months: number) => void; onToday: () => void; onOpenDay: (d: Date) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const heading = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isThis = anchor.getMonth() === today.getMonth() && anchor.getFullYear() === today.getFullYear();
  return (
    <section className="card month" aria-label={heading}>
      <div className="month-head">
        <div className="panel-head">
          <h2>{heading}</h2>
          <Nav unit="month" onPrev={() => onStep(-1)} onNext={() => onStep(1)} onToday={onToday} showToday={!isThis} />
        </div>
        <ViewToggle view={view} onView={onView} onAdd={onAdd} />
      </div>
      <div className="month-dow" aria-hidden="true">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="month-grid">
        {Array.from({ length: 42 }, (_, i) => {
          const d = addDays(gridStart, i);
          const evs = eventsFor(d);
          const isToday = sameDay(d, today);
          const inMonth = d.getMonth() === anchor.getMonth();
          return (
            <button key={i} type="button" className="mcell" onClick={() => onOpenDay(d)}
              aria-label={`Open ${longLabel(d)}${evs.length ? `, ${evs.length} ${evs.length === 1 ? "event" : "events"}` : ""}`}
              >
              <span className="top">
                <span className="n" style={{ background: isToday ? "#410016" : "transparent", color: isToday ? "#FBFAF5" : inMonth ? "#410016" : "#85695F" }}>{d.getDate()}</span>
                {evs.length > 2 && <span className="more" style={{ paddingRight: 2 }}>+{evs.length - 2}</span>}
              </span>
              {evs.slice(0, 2).map((e) => (
                <span key={e.id} className="mev" style={{ background: eventBg(e.who) }}>
                  <Dots who={e.who} />
                  <b>{fmtShort(e.start, e.allDay)}</b>
                  <span className="tt">{e.title}</span>
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </section>
  );
}

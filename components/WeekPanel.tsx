import { DOW, addDays, fmtRange, sameDay, shortMD, startOfWeek } from "@/lib/dates";
import { eventBg } from "@/lib/people";
import type { CalEvent } from "@/lib/types";
import { Dots, Nav, ViewToggle, type View } from "./Common";

export default function WeekPanel({ view, onView, onAdd, anchor, today, eventsFor, onStep, onToday, onOpenDay }: {
  view: View; onView: (v: View) => void; onAdd: () => void;
  anchor: Date; today: Date; eventsFor: (d: Date) => CalEvent[];
  onStep: (n: number) => void; onToday: () => void; onOpenDay: (d: Date) => void;
}) {
  const ws = startOfWeek(anchor);
  const thisWs = startOfWeek(today);
  const isThis = sameDay(ws, thisWs);
  const heading = isThis ? "This week"
    : sameDay(ws, addDays(thisWs, 7)) ? "Next week"
    : sameDay(ws, addDays(thisWs, -7)) ? "Last week"
    : `${shortMD(ws)} – ${shortMD(addDays(ws, 6))}`;
  return (
    <section className="card week" aria-label={heading}>
      <div className="panel-head">
        <h2>{heading}</h2>
        <Nav unit="week" onPrev={() => onStep(-7)} onNext={() => onStep(7)} onToday={onToday} showToday={!isThis} />
        <div className="push"><ViewToggle view={view} onView={onView} onAdd={onAdd} /></div>
      </div>
      <div className="week-grid">
        {DOW.map((dow, i) => {
          const d = addDays(ws, i);
          const evs = eventsFor(d);
          const isToday = sameDay(d, today);
          return (
            <button key={dow} type="button" className={`wday${isToday ? " today" : ""}`} onClick={() => onOpenDay(d)}
              aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${evs.length} events`}>
              <div className="dh"><span className="dow">{dow}</span><span className="num">{d.getDate()}</span></div>
              {evs.slice(0, 6).map((e) => (
                <div key={e.id} className="wev" style={{ background: eventBg(e.who) }}>
                  <div className="r1"><Dots who={e.who} /><span className="t">{e.title}</span></div>
                  <span className="tm">{fmtRange(e.start, e.end, e.allDay)}</span>
                </div>
              ))}
              {evs.length > 6 && <span className="more">+{evs.length - 6} more</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

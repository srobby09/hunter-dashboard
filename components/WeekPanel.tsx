import { DOW, addDays, fmtRange, sameDay, shortMD, startOfWeek } from "@/lib/dates";
import { eventBg } from "@/lib/people";
import { isMultiDay, weekSegments } from "@/lib/spans";
import type { CalEvent } from "@/lib/types";
import { Dots, Nav, ViewToggle, type View } from "./Common";

export default function WeekPanel({ view, onView, onAdd, anchor, today, eventsFor, multi, onStep, onToday, onOpenDay }: {
  view: View; onView: (v: View) => void; onAdd: () => void;
  anchor: Date; today: Date; eventsFor: (d: Date) => CalEvent[]; multi: CalEvent[];
  onStep: (n: number) => void; onToday: () => void; onOpenDay: (d: Date) => void;
}) {
  const ws = startOfWeek(anchor);
  const thisWs = startOfWeek(today);
  const isThis = sameDay(ws, thisWs);
  const heading = isThis ? "This week"
    : sameDay(ws, addDays(thisWs, 7)) ? "Next week"
    : sameDay(ws, addDays(thisWs, -7)) ? "Last week"
    : `${shortMD(ws)} – ${shortMD(addDays(ws, 6))}`;
  const { segs, lanes } = weekSegments(multi, ws);

  return (
    <section className="card week" aria-label={heading}>
      <div className="panel-head">
        <h2>{heading}</h2>
        <Nav unit="week" onPrev={() => onStep(-7)} onNext={() => onStep(7)} onToday={onToday} showToday={!isThis} />
        <div className="push"><ViewToggle view={view} onView={onView} onAdd={onAdd} /></div>
      </div>
      <div className="week-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => <span key={i} className="vline" aria-hidden="true" style={{ left: `${(i / 7) * 100}%` }} />)}

        <div className="wk-head">
          {DOW.map((dow, i) => {
            const d = addDays(ws, i);
            return (
              <div key={dow}>
                <span className="dow">{dow}</span>
                <span className={`num${sameDay(d, today) ? " today" : ""}`}>{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        {lanes > 0 && (
          <div className="wk-span" style={{ gridTemplateRows: `repeat(${lanes}, 24px)` }}>
            {segs.map((s) => (
              <div key={s.event.id} className={`bar${s.contLeft ? " cl" : ""}${s.contRight ? " cr" : ""}`}
                style={{ gridColumn: `${s.startCol + 1} / ${s.endCol + 2}`, gridRow: s.lane + 1, background: eventBg(s.event.who) }}>
                <Dots who={s.event.who} />
                <span className="t">{s.event.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className="wk-days">
          {DOW.map((dow, i) => {
            const d = addDays(ws, i);
            const all = eventsFor(d);
            const evs = all.filter((e) => !isMultiDay(e));
            return (
              <button key={dow} type="button" className="wday" onClick={() => onOpenDay(d)}
                aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${all.length} events`}>
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
      </div>
    </section>
  );
}

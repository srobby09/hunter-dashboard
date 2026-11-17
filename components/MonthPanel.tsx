import { DOW, addDays, fmtShort, longLabel, sameDay, startOfWeek } from "@/lib/dates";
import { eventBg } from "@/lib/people";
import { isMultiDay, weekSegments } from "@/lib/spans";
import type { CalEvent } from "@/lib/types";
import { Dots, Nav, ViewToggle, type View } from "./Common";

const LANE_STEP = 22; // 18px bar + 4px gap
const BAR_TOP = 5 + 24 + 4; // cell padding + date row + gap

export default function MonthPanel({ view, onView, onAdd, anchor, today, eventsFor, multi, onStep, onToday, onOpenDay }: {
  view: View; onView: (v: View) => void; onAdd: () => void;
  anchor: Date; today: Date; eventsFor: (d: Date) => CalEvent[]; multi: CalEvent[];
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
        {Array.from({ length: 6 }, (_, w) => {
          const ws = addDays(gridStart, w * 7);
          const { segs, lanes } = weekSegments(multi, ws);
          const slots = Math.max(0, 2 - Math.max(0, lanes - 1)); // bars take room from the single events
          return (
            <div className="mrow" key={w}>
              {Array.from({ length: 7 }, (_, c) => {
                const d = addDays(ws, c);
                const all = eventsFor(d);
                const evs = all.filter((e) => !isMultiDay(e));
                const isToday = sameDay(d, today);
                const inMonth = d.getMonth() === anchor.getMonth();
                const hidden = evs.length - slots;
                return (
                  <button key={c} type="button" className="mcell" onClick={() => onOpenDay(d)}
                    aria-label={`Open ${longLabel(d)}${all.length ? `, ${all.length} ${all.length === 1 ? "event" : "events"}` : ""}`}>
                    <span className="top">
                      <span className="n" style={{ background: isToday ? "#410016" : "transparent", color: isToday ? "#FBFAF5" : inMonth ? "#410016" : "#85695F" }}>{d.getDate()}</span>
                      {hidden > 0 && <span className="more" style={{ paddingRight: 2 }}>+{hidden}</span>}
                    </span>
                    {lanes > 0 && <span aria-hidden="true" style={{ height: lanes * LANE_STEP - 4, flex: "none" }} />}
                    {evs.slice(0, slots).map((e) => (
                      <span key={e.id} className="mev" style={{ background: eventBg(e.who) }}>
                        <Dots who={e.who} />
                        <b>{fmtShort(e.start, e.allDay)}</b>
                        <span className="tt">{e.title}</span>
                      </span>
                    ))}
                  </button>
                );
              })}
              {segs.map((s) => (
                <span key={s.event.id} className="mbar" aria-hidden="true" style={{
                  top: BAR_TOP + s.lane * LANE_STEP,
                  left: `calc(${s.startCol} / 7 * 100% + ${s.contLeft ? 0 : 6}px)`,
                  right: `calc(${6 - s.endCol} / 7 * 100% + ${s.contRight ? 0 : 6}px)`,
                  background: eventBg(s.event.who),
                  borderRadius: `${s.contLeft ? 0 : 6}px ${s.contRight ? 0 : 6}px ${s.contRight ? 0 : 6}px ${s.contLeft ? 0 : 6}px`,
                }}>
                  <Dots who={s.event.who} />
                  <span className="tt">{s.event.title}</span>
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

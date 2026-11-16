import { dayDiff, fmtRange, longLabel } from "@/lib/dates";
import { PEOPLE, eventBg } from "@/lib/people";
import type { CalEvent } from "@/lib/types";
import { Dots, Nav, ViewToggle, type View } from "./Common";

/** All-day events share the top row; overlapping timed events sit side by side. */
export function layoutRows(evs: CalEvent[]): CalEvent[][] {
  const rows: CalEvent[][] = [];
  const allDay = evs.filter((e) => e.allDay);
  if (allDay.length) rows.push(allDay);
  let cur: CalEvent[] | null = null;
  let curEnd = -1;
  evs.filter((e) => !e.allDay).sort((a, b) => a.start.getTime() - b.start.getTime()).forEach((e) => {
    if (cur && e.start.getTime() < curEnd) { cur.push(e); curEnd = Math.max(curEnd, e.end.getTime()); }
    else { cur = [e]; rows.push(cur); curEnd = e.end.getTime(); }
  });
  return rows;
}

export default function DayPanel({ view, onView, onAdd, anchor, today, events, onStep, onToday }: {
  view: View; onView: (v: View) => void; onAdd: () => void;
  anchor: Date; today: Date; events: CalEvent[]; onStep: (n: number) => void; onToday: () => void;
}) {
  const diff = dayDiff(anchor, today);
  const heading = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : longLabel(anchor);
  const sub = Math.abs(diff) <= 1 ? longLabel(anchor) : "";
  const rows = layoutRows(events);
  return (
    <section className="card day" aria-label={heading}>
      <div className="panel-head">
        <h2>{heading}</h2>
        {sub && <span className="sub">{sub}</span>}
        <Nav unit="day" onPrev={() => onStep(-1)} onNext={() => onStep(1)} onToday={onToday} showToday={diff !== 0} />
        <div className="push"><ViewToggle view={view} onView={onView} onAdd={onAdd} /></div>
      </div>
      {rows.length === 0 && <p className="empty">Nothing on the calendar.</p>}
      <div className="day-list">
        {rows.map((row, i) => (
          <div className="day-row" key={i}>
            {row.map((e) => (
              <div key={e.id} className="dev" style={{ background: eventBg(e.who) }}>
                <span className="dd"><Dots who={e.who} size={22} /></span>
                <div className="tx">
                  <span className="tt">{e.title}</span>
                  <span className="ts">{fmtRange(e.start, e.end, e.allDay)} · {e.who.map((w) => PEOPLE[w].name).join(" & ")}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

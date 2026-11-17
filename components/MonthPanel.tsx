"use client";
import { useEffect, useRef, useState } from "react";
import { DOW, addDays, fmtShort, longLabel, sameDay, startOfWeek } from "@/lib/dates";
import { eventBg } from "@/lib/people";
import { isMultiDay, weekSegments } from "@/lib/spans";
import type { CalEvent } from "@/lib/types";
import { Dots, Nav, ViewToggle, type View } from "./Common";

// Cell layout (px): 4 padding, 22 date row, 3 gap, then rows of 16 with 3 between.
const ITEM = 19; // one event row (16) + gap (3)
const BAR_TOP = 4 + 22 + 3;
const MIN_ITEMS = 3; // always show at least three events per day

export default function MonthPanel({ view, onView, onAdd, anchor, today, eventsFor, multi, onStep, onToday, onOpenDay }: {
  view: View; onView: (v: View) => void; onAdd: () => void;
  anchor: Date; today: Date; eventsFor: (d: Date) => CalEvent[]; multi: CalEvent[];
  onStep: (months: number) => void; onToday: () => void; onOpenDay: (d: Date) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(97);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setRowH(el.clientHeight / 6);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // How many event rows fit in a day cell (more on taller screens, never fewer than three).
  const capacity = Math.max(MIN_ITEMS, Math.floor((rowH - 31) / ITEM));

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
      <div className="month-grid" ref={gridRef}>
        {Array.from({ length: 6 }, (_, w) => {
          const ws = addDays(gridStart, w * 7);
          const { segs } = weekSegments(multi, ws);
          const drawn = segs.filter((s) => s.lane < capacity);
          return (
            <div className="mrow" key={w}>
              {Array.from({ length: 7 }, (_, c) => {
                const d = addDays(ws, c);
                const all = eventsFor(d);
                const evs = all.filter((e) => !isMultiDay(e));
                const here = segs.filter((s) => c >= s.startCol && c <= s.endCol);
                const lanesHere = here.length ? Math.min(capacity, Math.max(...here.map((s) => s.lane)) + 1) : 0;
                const slots = Math.max(0, capacity - lanesHere);
                const hidden = evs.length - Math.min(evs.length, slots) + here.filter((s) => s.lane >= capacity).length;
                const isToday = sameDay(d, today);
                const inMonth = d.getMonth() === anchor.getMonth();
                return (
                  <button key={c} type="button" className="mcell" onClick={() => onOpenDay(d)}
                    aria-label={`Open ${longLabel(d)}${all.length ? `, ${all.length} ${all.length === 1 ? "event" : "events"}` : ""}`}>
                    <span className="top">
                      <span className="n" style={{ background: isToday ? "#410016" : "transparent", color: isToday ? "#FBFAF5" : inMonth ? "#410016" : "#85695F" }}>{d.getDate()}</span>
                      {hidden > 0 && <span className="more" style={{ paddingRight: 2 }}>+{hidden}</span>}
                    </span>
                    {lanesHere > 0 && <span aria-hidden="true" style={{ height: lanesHere * ITEM - 3, flex: "none" }} />}
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
              {drawn.map((s) => (
                <span key={s.event.id} className="mbar" aria-hidden="true" style={{
                  top: BAR_TOP + s.lane * ITEM,
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

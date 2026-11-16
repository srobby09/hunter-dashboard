import { PEOPLE, type PersonId } from "@/lib/people";

export function Dots({ who, size = 16 }: { who: PersonId[]; size?: 16 | 18 | 22 }) {
  return (
    <>
      {who.map((id, i) => {
        const p = PEOPLE[id];
        return (
          <span key={id + i} aria-hidden="true" className={`dot s${size}`} style={{ background: p.color, color: p.fg }}>
            {p.init}
          </span>
        );
      })}
    </>
  );
}

const sv = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export const IconPlus = ({ size = 20 }: { size?: number }) => (
  <svg {...sv} width={size} height={size}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconLeft = () => (<svg {...sv}><path d="M15 18l-6-6 6-6" /></svg>);
export const IconRight = () => (<svg {...sv}><path d="M9 18l6-6-6-6" /></svg>);

export type View = "week" | "day" | "month";

export function ViewToggle({ view, onView, onAdd }: { view: View; onView: (v: View) => void; onAdd: () => void }) {
  const views: [View, string][] = [["week", "Week"], ["day", "Day"], ["month", "Month"]];
  return (
    <div className="tools">
      <div className="seg" role="group" aria-label="Calendar view">
        {views.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={view === id} onClick={() => onView(id)}>{label}</button>
        ))}
      </div>
      <button type="button" className="fab" aria-label="Add event" onClick={onAdd}><IconPlus size={24} /></button>
    </div>
  );
}

export function Nav({ unit, onPrev, onNext, onToday, showToday }: { unit: string; onPrev: () => void; onNext: () => void; onToday: () => void; showToday: boolean }) {
  return (
    <div className="nav">
      <button type="button" onClick={onPrev} aria-label={`Previous ${unit}`}><IconLeft /></button>
      <button type="button" onClick={onNext} aria-label={`Next ${unit}`}><IconRight /></button>
      {showToday && <button type="button" className="today" onClick={onToday}>Today</button>}
    </div>
  );
}

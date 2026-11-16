"use client";
import { useState } from "react";
import { addDays, dayKey, fmtRange } from "@/lib/dates";
import { PEOPLE, SELECTABLE, eventBg, type PersonId } from "@/lib/people";
import type { CalEvent, Repeat } from "@/lib/types";
import { Dots } from "./Common";

const REPEATS: [Repeat, string][] = [["none", "Never"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]];

const parseDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const withTime = (d: Date, t: string) => { const [h, m] = t.split(":").map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m); };

export default function AddEventSheet({ today, initialDate, onClose, onSave }: {
  today: Date; initialDate: Date; onClose: () => void; onSave: (e: CalEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [who, setWho] = useState<PersonId[]>([]);
  const [date, setDate] = useState(dayKey(initialDate));
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("17:00");
  const [repeat, setRepeat] = useState<Repeat>("none");

  const d = parseDate(date);
  const whoFinal: PersonId[] = who.length ? who : ["family"];
  const s = allDay ? d : withTime(d, start);
  const e = allDay ? d : withTime(d, end);
  const names = who.length ? who.map((w) => PEOPLE[w].name).join(" & ") : "Family";
  const repWord = { none: "", daily: " · every day", weekly: ` · every ${d.toLocaleDateString("en-US", { weekday: "long" })}`, monthly: " · every month", yearly: " · every year" }[repeat];
  const line = `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${fmtRange(s, e, allDay)} · ${names}${repWord}`;

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    onSave({ id: `new-${Date.now()}`, title: title.trim() || "New event", who: whoFinal, start: s, end: e < s ? s : e, allDay, repeat });
  };

  return (
    <div className="scrim" onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onSubmit={submit}>
        <div className="sheet-top">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <h1 id="sheet-title">New event</h1>
          <button type="submit" className="btn-primary">Save</button>
        </div>

        <div className="field">
          <label htmlFor="ev-title">What</label>
          <input id="ev-title" type="text" placeholder="Soccer practice, dentist, pizza night…" value={title} onChange={(x) => setTitle(x.target.value)} />
        </div>

        <fieldset className="field">
          <legend>Who <small>· pick nobody for a Family event</small></legend>
          <div className="whos">
            {SELECTABLE.map((id) => {
              const p = PEOPLE[id]; const on = who.includes(id);
              return (
                <button key={id} type="button" className="who" aria-pressed={on} style={{ background: on ? p.tint : "#fff" }}
                  onClick={() => setWho(on ? who.filter((x) => x !== id) : [...who, id])}>
                  <Dots who={[id]} size={22} /><span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="field">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5C2E33" }}>When</span>
          <div className="chips">
            {([["Today", today], ["Tomorrow", addDays(today, 1)]] as [string, Date][]).map(([label, v]) => (
              <button key={label} type="button" className="chip" aria-pressed={date === dayKey(v)} onClick={() => setDate(dayKey(v))}>{label}</button>
            ))}
            <label htmlFor="ev-date" className="sr-only">Date</label>
            <input id="ev-date" type="date" className="inp" style={{ borderRadius: 999 }} value={date} onChange={(x) => x.target.value && setDate(x.target.value)} />
          </div>
          <div className="times">
            <label className="allday"><input type="checkbox" checked={allDay} onChange={() => setAllDay(!allDay)} /> All day</label>
            {!allDay && (<>
              <label htmlFor="ev-start" style={{ marginLeft: 12 }}>From</label>
              <input id="ev-start" type="time" className="inp" value={start} onChange={(x) => setStart(x.target.value)} />
              <label htmlFor="ev-end">to</label>
              <input id="ev-end" type="time" className="inp" value={end} onChange={(x) => setEnd(x.target.value)} />
            </>)}
          </div>
        </div>

        <div className="field">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5C2E33" }}>Repeats</span>
          <div className="seg2" role="group" aria-label="Repeats">
            {REPEATS.map(([id, label]) => <button key={id} type="button" aria-pressed={repeat === id} onClick={() => setRepeat(id)}>{label}</button>)}
          </div>
        </div>

        <div className="preview">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#5C2E33" }}>Preview</span>
          <div className="card2" style={{ background: eventBg(whoFinal) }}>
            <span style={{ display: "flex", gap: 3, flex: "none" }}><Dots who={whoFinal} size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="pt">{title.trim() || "New event"}</div>
              <div className="pl">{line}</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

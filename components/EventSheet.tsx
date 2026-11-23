"use client";
import { useEffect, useState } from "react";
import { addDays, ap, dayKey, fmtRange, hm } from "@/lib/dates";
import { daysBetween, shiftDate, type EditInput, type Scope } from "@/lib/eventEdit";
import type { NewEventInput } from "@/lib/eventPayload";
import { PEOPLE, SELECTABLE, eventBg, type PersonId } from "@/lib/people";
import type { CalEvent, Repeat } from "@/lib/types";
import { buildTitle } from "@/lib/who";
import { Dots, isFamily } from "./Common";

type RepeatChoice = Repeat | "keep";
const REPEATS: [Repeat, string][] = [["none", "Never"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]];

const parseDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const withTime = (d: Date, t: string) => { const [h, m] = t.split(":").map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m); };
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const shortDay = (s: string) => parseDate(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const clock = (d: Date) => `${hm(d)} ${ap(d)}`;

/** One sheet for adding a new event and for changing or deleting an existing one. */
export default function EventSheet({ today, initialDate, event, onClose, onCreate, onUpdate, onDelete }: {
  today: Date; initialDate: Date; event?: CalEvent; onClose: () => void;
  onCreate: (input: NewEventInput) => Promise<string | null>;
  onUpdate: (id: string, input: EditInput) => Promise<string | null>;
  onDelete: (id: string, scope: Scope) => Promise<string | null>;
}) {
  const editing = !!event;
  const recurring = !!event?.recurringId;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(event?.title ?? "");
  const [who, setWho] = useState<PersonId[]>(event ? event.who.filter((w) => w !== "family") : []);
  const [date, setDate] = useState(dayKey(event?.start ?? initialDate));
  const [endDate, setEndDate] = useState(event ? dayKey(event.allDay ? addDays(event.end, -1) : event.end) : dayKey(initialDate)); // inclusive
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [start, setStart] = useState(event && !event.allDay ? hhmm(event.start) : "16:00");
  const [end, setEnd] = useState(event && !event.allDay ? hhmm(event.end) : "17:00");
  const [repeat, setRepeat] = useState<RepeatChoice>(recurring ? "keep" : "none");
  const [scope, setScope] = useState<Scope>("one");
  const [custom, setCustom] = useState(false); // the series repeats in a way our buttons can't show
  const [confirmDelete, setConfirmDelete] = useState(false);
  const originalDate = dayKey(event?.start ?? initialDate);

  // For a repeating event, find out how it repeats
  useEffect(() => {
    if (!event?.recurringId) return;
    let live = true;
    fetch(`/api/calendar/events/${encodeURIComponent(event.id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { repeat?: string } | null) => {
        if (!live || !j?.repeat) return;
        if (["daily", "weekly", "monthly", "yearly"].includes(j.repeat)) setRepeat(j.repeat as Repeat);
        else setCustom(true); // stays "keep"
      })
      .catch(() => {});
    return () => { live = false; };
  }, [event]);

  const moveStart = (d: string) => { setEndDate(shiftDate(d, Math.max(0, daysBetween(date, endDate)))); setDate(d); }; // moving the start keeps the length
  const showEnd = allDay || endDate !== date;

  const d = parseDate(date);
  const whoFinal: PersonId[] = who.length ? who : ["family"];
  const names = who.length ? who.map((w) => PEOPLE[w].name).join(" & ") : "Family";
  const repWord = recurring && scope === "one" ? "" : ({ none: "", keep: "", daily: " · every day", weekly: ` · every ${d.toLocaleDateString("en-US", { weekday: "long" })}`, monthly: " · every month", yearly: " · every year" } as Record<RepeatChoice, string>)[repeat];
  const when = allDay
    ? `${shortDay(date)}${endDate !== date ? ` – ${shortDay(endDate)}` : ""} · All day`
    : endDate !== date
      ? `${shortDay(date)} ${clock(withTime(d, start))} – ${shortDay(endDate)} ${clock(withTime(parseDate(endDate), end))}`
      : `${shortDay(date)} · ${fmtRange(withTime(d, start), withTime(d, end), false)}`;
  const line = `${when} · ${names}${repWord}`;

  const seriesNote = recurring && scope === "all" && date !== originalDate;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    if (!title.trim()) { setError("Please enter what the event is."); return; }
    if (endDate < date) { setError("The end date can't be before the start date."); return; }
    if (!allDay && endDate === date && end <= start) { setError("The end time needs to be after the start time."); return; }
    setError(null);
    setBusy(true);
    const base = { title: title.trim(), who, date, endDate, allDay, start, end };
    const msg = event
      ? await onUpdate(event.id, { ...base, scope: recurring ? scope : "one", originalDate, repeat: recurring && scope === "one" ? "keep" : repeat })
      : await onCreate({ ...base, repeat: repeat as Repeat });
    if (msg) { setError(msg); setBusy(false); } // on success the dashboard closes the sheet
  };

  const remove = async () => {
    if (!event || busy) return;
    setBusy(true);
    const msg = await onDelete(event.id, recurring ? scope : "one");
    if (msg) { setError(msg); setBusy(false); setConfirmDelete(false); }
  };

  const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#5C2E33" };

  return (
    <div className="scrim" onClick={(ev) => { if (ev.target === ev.currentTarget && !busy) onClose(); }}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onSubmit={submit}>
        <div className="sheet-top">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <h1 id="sheet-title">{editing ? "Edit event" : "New event"}</h1>
          <button type="submit" className="btn-primary" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>

        {recurring && (
          <div className="field">
            <span style={label}>This event repeats. Apply changes to</span>
            <div className="seg2" role="group" aria-label="Apply changes to">
              <button type="button" aria-pressed={scope === "one"} onClick={() => setScope("one")}>This event</button>
              <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>All events</button>
            </div>
          </div>
        )}

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
          <span style={label}>When</span>
          <div className="chips">
            {([["Today", today], ["Tomorrow", addDays(today, 1)]] as [string, Date][]).map(([lbl, v]) => (
              <button key={lbl} type="button" className="chip" aria-pressed={date === dayKey(v)} onClick={() => moveStart(dayKey(v))}>{lbl}</button>
            ))}
            <label htmlFor="ev-date" className="sr-only">Date</label>
            <input id="ev-date" type="date" className="inp" style={{ borderRadius: 999 }} value={date} onChange={(x) => x.target.value && moveStart(x.target.value)} />
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
          {showEnd && (
            <div className="times">
              <label htmlFor="ev-end-date">{allDay ? "Until" : "Ends on"}</label>
              <input id="ev-end-date" type="date" className="inp" min={date} value={endDate} onChange={(x) => x.target.value && setEndDate(x.target.value)} />
            </div>
          )}
          {!showEnd && !allDay && <button type="button" className="link" onClick={() => setEndDate(shiftDate(date, 1))}>Ends on a different day?</button>}
          {seriesNote && <p className="hint">Changing the date moves the whole series by the same number of days.</p>}
        </div>

        {(!recurring || scope === "all") ? (
          <div className="field">
            <span style={label}>Repeats</span>
            <div className="seg2" role="group" aria-label="Repeats">
              {custom && <button type="button" aria-pressed={repeat === "keep"} onClick={() => setRepeat("keep")}>Keep current</button>}
              {REPEATS.filter(([id]) => !(recurring && id === "none")).map(([id, lbl]) => <button key={id} type="button" aria-pressed={repeat === id} onClick={() => setRepeat(id)}>{lbl}</button>)}
            </div>
          </div>
        ) : (
          <p className="hint">Part of a repeating event. Choose “All events” above to change how it repeats.</p>
        )}

        <div className="preview">
          <span style={label}>Preview</span>
          <div className="card2" style={{ background: eventBg(whoFinal) }}>
            {!isFamily(whoFinal) && <span style={{ display: "flex", gap: 3, flex: "none" }}><Dots who={whoFinal} size={22} /></span>}
            <div style={{ minWidth: 0 }}>
              <div className="pt">{title.trim() || "New event"}</div>
              <div className="pl">{line}</div>
            </div>
          </div>
          <div className="pl" style={{ fontSize: 13 }}>Saves to Google Calendar as: <b>{buildTitle(title.trim() || "New event", who)}</b></div>
          {error && <p role="alert" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#A9500F" }}>{error}</p>}
        </div>

        {editing && (
          <div className="danger-zone">
            {!confirmDelete ? (
              <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete event</button>
            ) : (
              <div className="confirm" role="alertdialog" aria-label="Confirm delete">
                <span>{recurring ? (scope === "all" ? "Delete every event in this series?" : "Delete only this event?") : "Delete this event?"}</span>
                <button type="button" className="btn-danger solid" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Yes, delete"}</button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

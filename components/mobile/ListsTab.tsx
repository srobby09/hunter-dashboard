"use client";
import { useState } from "react";
import type { DashboardData } from "@/lib/useDashboardData";
import { PlusIcon } from "./Icons";
import PullScroll from "./PullScroll";

type Item = { id: string; text: string; done: boolean; due?: string };

export default function ListsTab({ data }: { data: DashboardData }) {
  const [seg, setSeg] = useState<"toget" | "reminders">("toget");
  const [held, setHeld] = useState<Set<string>>(new Set()); // just-ticked items stay put for a moment before dropping to the bottom
  const [draft, setDraft] = useState("");

  const toGet: Item[] = data.groceries;
  const reminders: Item[] = data.reminders;
  const items = seg === "toget" ? toGet : reminders;
  const open = (l: Item[]) => l.filter((x) => !x.done).length;

  const sorted = items.map((x, i) => ({ x, i })).sort((a, b) => Number(a.x.done && !held.has(a.x.id)) - Number(b.x.done && !held.has(b.x.id)) || a.i - b.i).map(({ x }) => x);

  const toggle = (it: Item) => {
    if (!it.done) { // being ticked now: hold its place for 3 seconds
      setHeld((s) => new Set(s).add(it.id));
      setTimeout(() => setHeld((s) => { const n = new Set(s); n.delete(it.id); return n; }), 3000);
    }
    (seg === "toget" ? data.toggleGrocery : data.toggleReminder)(it.id);
  };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    (seg === "toget" ? data.addGrocery : data.addReminder)(t);
    setDraft("");
  };

  const err = seg === "toget" ? data.groceryError : data.remError;
  const problem = err === "save" ? "Couldn't save that. Please try again."
    : err === "pickle_not_configured" ? "Not connected to Pickle yet."
    : err === "pickle_unauthorized" ? "Pickle refused the secret. See Settings."
    : err === "expired" ? "Google login expired. Reconnect in Settings."
    : err ? "Can't reach the list right now. Showing the last update." : null;

  return (
    <div className="m-tab">
      <header className="m-title"><h1>Lists</h1></header>
      <div className="m-seg" role="group" aria-label="List">
        <button type="button" aria-pressed={seg === "toget"} onClick={() => setSeg("toget")}>To get · {open(toGet)}</button>
        <button type="button" aria-pressed={seg === "reminders"} onClick={() => setSeg("reminders")}>Reminders · {open(reminders)}</button>
      </div>
      <p className="m-note">{seg === "toget" ? "Shared with Pickle. Ingredients from this week’s meals land here." : "From Google Tasks."}</p>
      {problem && <p className="m-problem" role="alert">{problem}</p>}

      <PullScroll className="m-list" onRefresh={data.refreshAll}>
        {sorted.length === 0 && !err && <p className="m-empty">{seg === "toget" ? "Nothing on the list." : "Nothing to do right now."}</p>}
        <ul>
          {sorted.map((it) => (
            <li key={it.id}>
              <label className={`m-row${it.done ? " done" : ""}`}>
                <input type="checkbox" checked={it.done} onChange={() => toggle(it)} />
                <span className="tx">{it.text}</span>
                {it.due && <span className="due">{it.due}</span>}
              </label>
            </li>
          ))}
        </ul>
      </PullScroll>

      <form className="m-add" onSubmit={add}>
        <label htmlFor="m-add-input" className="sr-only">{seg === "toget" ? "Add to the list" : "Add a reminder"}</label>
        <input id="m-add-input" type="text" enterKeyHint="done" placeholder={seg === "toget" ? "Add to the list…" : "Add a reminder…"} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" aria-label={seg === "toget" ? "Add to the list" : "Add reminder"}><PlusIcon /></button>
      </form>
    </div>
  );
}

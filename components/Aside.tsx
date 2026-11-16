"use client";
import { useState } from "react";
import { shortMD } from "@/lib/dates";
import type { Birthday, GroceryItem, Meal, Reminder } from "@/lib/types";
import { IconPlus } from "./Common";

function AddBox({ id, label, placeholder, onAdd }: { id: string; label: string; placeholder: string; onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form className="add" onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (t) { onAdd(t); setV(""); } }}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type="text" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} enterKeyHint="done" />
      <button type="submit" aria-label={label}><IconPlus size={18} /></button>
    </form>
  );
}

function Check({ done, text, due, onToggle }: { done: boolean; text: string; due?: string; onToggle: () => void }) {
  return (
    <label className={`chk${done ? " done" : ""}`}>
      <input type="checkbox" checked={done} onChange={onToggle} />
      <span className="tx">{text}</span>
      {due && <span className="due">{due}</span>}
    </label>
  );
}

export default function Aside({ reminders, onToggleReminder, onAddReminder, meals, groceries, onToggleGrocery, onAddGrocery, birthdays }: {
  reminders: Reminder[]; onToggleReminder: (id: string) => void; onAddReminder: (t: string) => void;
  meals: Meal[];
  groceries: GroceryItem[]; onToggleGrocery: (id: string) => void; onAddGrocery: (t: string) => void;
  birthdays: Birthday[];
}) {
  const open = reminders.filter((r) => !r.done).length;
  const left = groceries.filter((g) => !g.done).length;
  return (
    <div className="bottom">
      <section className="card reminders" aria-label="Reminders">
        <div className="row-head"><h2>Reminders</h2><span className="pill">{open} open</span></div>
        <div className="todo-list">
          {reminders.map((r) => <Check key={r.id} done={r.done} text={r.text} due={r.due} onToggle={() => onToggleReminder(r.id)} />)}
        </div>
        <AddBox id="new-reminder" label="Add reminder" placeholder="Add a reminder…" onAdd={onAddReminder} />
      </section>

      <section className="card meals" aria-label="Meals">
        <div className="row-head"><h2>Meals</h2><span className="pill olive">from Pickle</span></div>
        {meals.map((m) => (
          <div key={m.day} className={`meal${m.isToday ? " today" : ""}`}>
            <span className="d">{m.day}</span><span className="m">{m.meal}</span>
          </div>
        ))}
      </section>

        <section className="card tile" aria-label="To get">
          <div className="row-head" style={{ alignItems: "baseline" }}><h2>To get</h2><span className="pill" style={{ background: "none", padding: 0 }}>{left} items</span></div>
          <div className="list">
            {groceries.map((g) => <Check key={g.id} done={g.done} text={g.text} onToggle={() => onToggleGrocery(g.id)} />)}
          </div>
          <AddBox id="new-grocery" label="Add to the list" placeholder="Add…" onAdd={onAddGrocery} />
        </section>
        <section className="card tile" aria-label="Upcoming birthdays" style={{ padding: 16, gap: 8 }}>
          <h2>Birthdays</h2>
          {birthdays.slice(0, 2).map((b) => (
            <div className="bday" key={b.name}>
              <b>{b.name}</b>
              <span>{b.date.toLocaleDateString("en-US", { weekday: "short" })}, {shortMD(b.date)}{b.daysAway <= 14 ? ` · ${b.daysAway} days` : ""}</span>
            </div>
          ))}
        </section>
    </div>
  );
}

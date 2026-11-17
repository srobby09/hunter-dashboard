"use client";
import { useState } from "react";
import { shortMD } from "@/lib/dates";
import { daysLabel } from "@/lib/reminderUtils";
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

export default function Aside({ reminders, reminderError, onToggleReminder, onAddReminder, meals, mealsError, groceries, groceryError, onToggleGrocery, onAddGrocery, birthdays }: {
  reminders: Reminder[]; reminderError?: string | null; onToggleReminder: (id: string) => void; onAddReminder: (t: string) => void;
  meals: Meal[]; mealsError?: string | null;
  groceries: GroceryItem[]; groceryError?: string | null; onToggleGrocery: (id: string) => void; onAddGrocery: (t: string) => void;
  birthdays: Birthday[];
}) {
  const open = reminders.filter((r) => !r.done).length;
  const left = groceries.filter((g) => !g.done).length;
  return (
    <div className="bottom">
      <section className="card reminders" aria-label="Reminders">
        <div className="row-head"><h2>Reminders</h2><span className="pill">{open} open</span></div>
        <div className="todo-list">
          {reminders.length === 0 && <p style={{ fontSize: 14, color: "#7A4A4E", padding: "6px 0" }}>Nothing to do right now.</p>}
          {reminders.map((r) => <Check key={r.id} done={r.done} text={r.text} due={r.due} onToggle={() => onToggleReminder(r.id)} />)}
        </div>
        {reminderError && <p role="alert" style={{ fontSize: 13, fontWeight: 600, color: "#A9500F" }}>{reminderError}</p>}
        <AddBox id="new-reminder" label="Add reminder" placeholder="Add a reminder…" onAdd={onAddReminder} />
      </section>

      <section className="card meals" aria-label="Meals">
        <div className="row-head"><h2>Meals</h2>{mealsError ? <span className="pill" style={{ color: "#A9500F", background: "#F6DFCB" }}>Pickle offline</span> : <span className="pill olive">from Pickle</span>}</div>
        {meals.length === 0 && mealsError && <p style={{ fontSize: 14, color: "#7A4A4E" }}>{mealsError === "pickle_not_configured" ? "Not connected to Pickle yet." : "Can't reach Pickle right now."}</p>}
        {meals.map((m) => (
          <div key={m.day} className={`meal${m.isToday ? " today" : ""}`}>
            <span className="d">{m.day}</span><span className="m" style={m.empty ? { color: "#9A7A7C" } : undefined}>{m.meal}</span>
          </div>
        ))}
      </section>

        <section className="card reminders" aria-label="To get">
          <div className="row-head"><h2>To get</h2><span className="pill">{left} items</span></div>
          <div className="todo-list">
            {groceries.length === 0 && !groceryError && <p style={{ fontSize: 14, color: "#7A4A4E", padding: "6px 0" }}>Nothing on the list.</p>}
            {groceries.length === 0 && groceryError && groceryError !== "save" && <p style={{ fontSize: 14, color: "#7A4A4E", padding: "6px 0" }}>{groceryError === "pickle_not_configured" ? "Not connected to Pickle yet." : "Can't reach Pickle right now."}</p>}
            {groceries.map((g) => <Check key={g.id} done={g.done} text={g.text} onToggle={() => onToggleGrocery(g.id)} />)}
          </div>
          {groceryError === "save" && <p role="alert" style={{ fontSize: 13, fontWeight: 600, color: "#A9500F" }}>Couldn't save that. Please try again.</p>}
          <AddBox id="new-grocery" label="Add to the list" placeholder="Add…" onAdd={onAddGrocery} />
        </section>
        <section className="card tile" aria-label="Upcoming birthdays" style={{ padding: 16, gap: 8 }}>
          <h2>Birthdays</h2>
          {birthdays.length === 0 && <p style={{ fontSize: 14, color: "#7A4A4E" }}>No birthdays coming up.</p>}
          {birthdays.slice(0, 2).map((b) => (
            <div className="bday" key={b.name + b.date.getTime()}>
              <b>{b.name}</b>
              <span>{b.date.toLocaleDateString("en-US", { weekday: "short" })}, {shortMD(b.date)}{daysLabel(b.daysAway) ? ` · ${daysLabel(b.daysAway)}` : ""}</span>
            </div>
          ))}
        </section>
    </div>
  );
}

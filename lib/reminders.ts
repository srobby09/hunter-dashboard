// Reminders sit behind this small interface so Google Tasks can later be swapped
// for Apple Reminders (Capacitor) without touching the UI.
import { dueLabel, pickReminders, type RawTask } from "./reminderUtils";
import type { Reminder } from "./types";

export interface RemindersProvider {
  listReminders(): Promise<Reminder[]>;
  addReminder(text: string): Promise<Reminder>;
  completeReminder(id: string, done: boolean): Promise<void>;
}

async function ok(r: Response): Promise<Response> {
  if (r.ok) return r;
  const { error } = (await r.json().catch(() => ({}))) as { error?: string };
  throw new Error(error ?? "error");
}

/** Google Tasks, through the dashboard's own server routes. */
export function createGoogleReminders(): RemindersProvider {
  return {
    async listReminders() {
      const { tasks } = (await (await ok(await fetch("/api/reminders", { cache: "no-store" }))).json()) as { tasks: RawTask[] };
      const today = new Date();
      return pickReminders(tasks, today).map((t) => ({ id: t.id, text: t.text, due: dueLabel(t.dueDate, today), done: t.done }));
    },
    async addReminder(text) {
      const r = await ok(await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }));
      const { task } = (await r.json()) as { task: RawTask };
      return { id: task.id, text: task.title?.trim() || text, done: false };
    },
    async completeReminder(id, done) {
      await ok(await fetch(`/api/reminders/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done }) }));
    },
  };
}

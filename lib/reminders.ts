// Reminders sit behind this small interface so Google Tasks can later be swapped
// for Apple Reminders (Capacitor) without touching the UI.
import type { Reminder } from "./types";
import { sampleReminders } from "./sample";

export interface RemindersProvider {
  listReminders(): Promise<Reminder[]>;
  addReminder(text: string): Promise<Reminder>;
  completeReminder(id: string, done: boolean): Promise<void>;
}

/** In-memory sample provider (step 1). Replaced by Google Tasks in step 5. */
export function createSampleReminders(): RemindersProvider {
  let items = [...sampleReminders];
  return {
    async listReminders() {
      return items;
    },
    async addReminder(text) {
      const r: Reminder = { id: `r${Date.now()}`, text, done: false };
      items = [...items, r];
      return r;
    },
    async completeReminder(id, done) {
      items = items.map((r) => (r.id === id ? { ...r, done } : r));
    },
  };
}

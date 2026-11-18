import { googleFetch } from "./google";
import { findByName } from "./names";
import type { RawTask } from "./reminderUtils";

const LIST_NAME = process.env.REMINDERS_LIST_NAME ?? "Hunter Reminders";
const BASE = "https://tasks.googleapis.com/tasks/v1";
let listId: string | null = null;

async function findListId(): Promise<string> {
  if (listId) return listId;
  const r = await googleFetch(`${BASE}/users/@me/lists?maxResults=100`);
  if (!r.ok) throw new Error(`taskLists ${r.status}`);
  const j = (await r.json()) as { items?: { id: string; title: string }[] };
  const l = findByName(j.items ?? [], LIST_NAME, (x) => [x.title]);
  if (!l) throw new Error("list_not_found");
  listId = l.id;
  return l.id;
}

/** Open tasks and recently completed ones (the caller keeps only those finished today). */
export async function listTasks(): Promise<RawTask[]> {
  const id = await findListId();
  const p = new URLSearchParams({
    showCompleted: "true", showHidden: "true", maxResults: "100",
    completedMin: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  });
  const r = await googleFetch(`${BASE}/lists/${encodeURIComponent(id)}/tasks?${p}`);
  if (!r.ok) throw new Error(`tasks ${r.status}`);
  return ((await r.json()) as { items?: RawTask[] }).items ?? [];
}

export async function addTask(title: string): Promise<RawTask> {
  const id = await findListId();
  const r = await googleFetch(`${BASE}/lists/${encodeURIComponent(id)}/tasks`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error(`addTask ${r.status}`);
  return (await r.json()) as RawTask;
}

export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  const id = await findListId();
  const r = await googleFetch(`${BASE}/lists/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(done ? { status: "completed" } : { status: "needsAction", completed: null }),
  });
  if (!r.ok) throw new Error(`setTask ${r.status}`);
}

import { NextResponse } from "next/server";
import { failure, notConfigured, sameOriginOnly } from "@/lib/apiGuard";
import { addTask, listTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export async function GET() {
  const nc = notConfigured();
  if (nc) return nc;
  try {
    return NextResponse.json({ tasks: await listTasks() });
  } catch (e) { return failure(e); }
}

export async function POST(req: Request) {
  const bad = sameOriginOnly(req) ?? notConfigured();
  if (bad) return bad;
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 500) return NextResponse.json({ error: "bad_text" }, { status: 400 });
  try {
    return NextResponse.json({ task: await addTask(text) });
  } catch (e) { return failure(e); }
}

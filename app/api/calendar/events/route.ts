import { NextResponse } from "next/server";
import { listEvents } from "@/lib/calendar";
import { storeConfigured } from "@/lib/store";
import { googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get("from");
  const to = q.get("to");
  if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) return NextResponse.json({ error: "bad_range" }, { status: 400 });
  if (!googleConfigured() || !storeConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    return NextResponse.json({ events: await listEvents(from, to), fetchedAt: new Date().toISOString() });
  } catch (e) {
    const m = e instanceof Error ? e.message : "error";
    const error = m === "not_connected" || m === "expired" || m === "calendar_not_found" ? m : "calendar_error";
    return NextResponse.json({ error }, { status: error === "calendar_error" ? 502 : 401 });
  }
}

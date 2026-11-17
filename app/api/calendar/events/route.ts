import { NextResponse } from "next/server";
import { insertEvent, listEvents } from "@/lib/calendar";
import { buildGoogleEvent } from "@/lib/eventPayload";
import { storeConfigured } from "@/lib/store";
import { googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

const knownError = (m: string) => (m === "not_connected" || m === "expired" || m === "calendar_not_found" ? m : "calendar_error");

export async function POST(req: Request) {
  // Only the dashboard itself may write to the calendar.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!googleConfigured() || !storeConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  let input: unknown;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const built = buildGoogleEvent(input);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });
  try {
    return NextResponse.json({ id: await insertEvent(built.body) });
  } catch (e) {
    const error = knownError(e instanceof Error ? e.message : "");
    return NextResponse.json({ error }, { status: error === "calendar_error" ? 502 : 401 });
  }
}

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

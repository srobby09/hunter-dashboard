import { NextResponse } from "next/server";
import { connectionInfo, googleConfigured, googleFetch } from "@/lib/google";
import { storeConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = { configured: googleConfigured(), storeConfigured: storeConfigured() };
  if (!base.configured || !base.storeConfigured) return NextResponse.json({ ...base, connected: false, connectedAt: null, calendars: [] });
  const info = await connectionInfo();
  if (!info.connected) return NextResponse.json({ ...base, ...info, calendars: [] });
  try {
    const r = await googleFetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader");
    if (!r.ok) throw new Error(`calendar ${r.status}`);
    const j = (await r.json()) as { items?: { summary: string; accessRole: string }[] };
    return NextResponse.json({ ...base, ...info, expired: false, calendars: (j.items ?? []).map((c) => ({ name: c.summary, role: c.accessRole })) });
  } catch (e) {
    const expired = e instanceof Error && e.message === "expired";
    return NextResponse.json({ ...base, ...info, expired, calendars: [], problem: expired ? "expired" : "calendar_error" });
  }
}

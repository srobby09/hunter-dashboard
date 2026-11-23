import { NextResponse } from "next/server";
import { deleteEvent, eventDetails, updateEvent } from "@/lib/calendar";
import { failure, notConfigured, sameOriginOnly } from "@/lib/apiGuard";
import type { EditInput } from "@/lib/eventEdit";

export const dynamic = "force-dynamic";

const ID = /^[\w-]{1,200}$/;
const BAD_EDIT = new Set(["bad_title", "bad_who", "bad_date", "bad_time", "bad_repeat", "bad_request", "end_before_start"]);

type Ctx = { params: Promise<{ id: string }> };

/** Whether the event repeats (the edit sheet asks before showing "This event / All events"). */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const nc = notConfigured();
  if (nc) return nc;
  try {
    return NextResponse.json(await eventDetails(id));
  } catch (e) { return failure(e); }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const bad = sameOriginOnly(req) ?? notConfigured();
  if (bad) return bad;
  const { id } = await params;
  const input = (await req.json().catch(() => null)) as EditInput | null;
  if (!ID.test(id) || !input || typeof input !== "object" || (input.scope !== "one" && input.scope !== "all") || (input.repeat as string) === undefined) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    await updateEvent(id, input);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (BAD_EDIT.has(m)) return NextResponse.json({ error: m }, { status: 400 });
    return failure(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const bad = sameOriginOnly(req) ?? notConfigured();
  if (bad) return bad;
  const { id } = await params;
  const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "one";
  if (!ID.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    await deleteEvent(id, scope);
    return NextResponse.json({ ok: true });
  } catch (e) { return failure(e); }
}

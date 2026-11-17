import { NextResponse } from "next/server";
import { pickleFailure, sameOriginOnly } from "@/lib/apiGuard";
import { setGroceryDone } from "@/lib/pickle";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const bad = sameOriginOnly(req);
  if (bad) return bad;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { done?: unknown } | null;
  if (typeof body?.done !== "boolean" || !/^[\w-]{1,100}$/.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    await setGroceryDone(id, body.done);
    return NextResponse.json({ ok: true });
  } catch (e) { return pickleFailure(e); }
}

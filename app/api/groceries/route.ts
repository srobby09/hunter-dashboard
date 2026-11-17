import { NextResponse } from "next/server";
import { pickleFailure, sameOriginOnly } from "@/lib/apiGuard";
import { addGrocery, getGroceries } from "@/lib/pickle";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ items: await getGroceries() });
  } catch (e) { return pickleFailure(e); }
}

export async function POST(req: Request) {
  const bad = sameOriginOnly(req);
  if (bad) return bad;
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) return NextResponse.json({ error: "bad_name" }, { status: 400 });
  try {
    return NextResponse.json({ item: await addGrocery(name) });
  } catch (e) { return pickleFailure(e); }
}

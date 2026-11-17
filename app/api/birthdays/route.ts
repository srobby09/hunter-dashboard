import { NextResponse } from "next/server";
import { listBirthdays } from "@/lib/calendar";
import { failure, notConfigured } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get("from");
  const to = q.get("to");
  if (!from || !to || isNaN(Date.parse(from)) || isNaN(Date.parse(to))) return NextResponse.json({ error: "bad_range" }, { status: 400 });
  const nc = notConfigured();
  if (nc) return nc;
  try {
    return NextResponse.json({ birthdays: await listBirthdays(from, to) });
  } catch (e) { return failure(e); }
}

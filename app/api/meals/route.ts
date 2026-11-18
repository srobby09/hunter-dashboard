import { NextResponse } from "next/server";
import { pickleFailure } from "@/lib/apiGuard";
import { getMeals } from "@/lib/pickle";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const week = new URL(req.url).searchParams.get("week");
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return NextResponse.json({ error: "bad_week" }, { status: 400 });
  try {
    return NextResponse.json({ days: await getMeals(week), home: process.env.PICKLE_API_URL?.replace(/\/+$/, "") ?? null });
  } catch (e) { return pickleFailure(e); }
}

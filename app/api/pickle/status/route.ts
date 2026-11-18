import { NextResponse } from "next/server";
import { PickleError, getMeals } from "@/lib/pickle";

export const dynamic = "force-dynamic";

/** Connection check for the Settings page. Reports which setting is missing and whether Pickle accepts the secret. Never returns the secret. */
export async function GET() {
  const url = process.env.PICKLE_API_URL?.replace(/\/+$/, "");
  const hasSecret = !!process.env.PICKLE_DASHBOARD_SECRET;
  const missing = [!url && "PICKLE_API_URL", !hasSecret && "PICKLE_DASHBOARD_SECRET"].filter(Boolean) as string[];
  if (missing.length) return NextResponse.json({ status: "not_configured", missing });

  let host = "";
  try { host = new URL(url!).host; } catch { return NextResponse.json({ status: "bad_url" }); }

  const sunday = new Date();
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  try {
    await getMeals(sunday.toISOString().slice(0, 10));
    return NextResponse.json({ status: "ok", host });
  } catch (e) {
    return NextResponse.json({ status: e instanceof PickleError ? e.code.replace("pickle_", "") : "unreachable", host });
  }
}

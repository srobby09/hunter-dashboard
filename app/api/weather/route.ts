import { NextResponse } from "next/server";
import { WEATHER_URL, parseWeather } from "@/lib/weather";

export async function GET() {
  try {
    const r = await fetch(WEATHER_URL, { next: { revalidate: 1800 } }); // cached for 30 minutes
    if (!r.ok) throw new Error(String(r.status));
    const w = parseWeather(await r.json());
    if (!w) throw new Error("bad_data");
    return NextResponse.json(w);
  } catch {
    return NextResponse.json({ error: "weather_unavailable" }, { status: 502 });
  }
}

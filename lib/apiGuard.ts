import { NextResponse } from "next/server";
import { googleConfigured } from "./google";
import { storeConfigured } from "./store";

/** Only the dashboard itself may change things. */
export function sameOriginOnly(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export const notConfigured = () => (!googleConfigured() || !storeConfigured() ? NextResponse.json({ error: "not_configured" }, { status: 503 }) : null);

const KNOWN = ["not_connected", "expired", "calendar_not_found", "list_not_found"];
export function failure(e: unknown): NextResponse {
  const m = e instanceof Error ? e.message : "";
  const error = KNOWN.includes(m) ? m : "google_error";
  return NextResponse.json({ error }, { status: error === "google_error" ? 502 : 401 });
}

import { PickleError } from "./pickle";

/** Maps a Pickle problem to a status the dashboard can show. */
export function pickleFailure(e: unknown): NextResponse {
  const code = e instanceof PickleError ? e.code : "pickle_unreachable";
  return NextResponse.json({ error: code }, { status: code === "pickle_not_configured" ? 503 : 502 });
}

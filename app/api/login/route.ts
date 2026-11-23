import { NextResponse } from "next/server";
import { authConfigured, COOKIE, isHttps, makeSession, passcodeMatches, safeNext, SESSION_MS } from "@/lib/auth";
import { sameOriginOnly } from "@/lib/apiGuard";
import { defaultCounter, loginAllowed, recordFailure, recordSuccess } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

export async function POST(req: Request) {
  const bad = sameOriginOnly(req);
  if (bad) return bad;
  if (!authConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { passcode?: unknown; next?: unknown } | null;
  const passcode = typeof body?.passcode === "string" ? body.passcode.slice(0, 200) : "";
  const counter = defaultCounter();
  const ip = clientIp(req);

  try {
    const allowed = await loginAllowed(counter, ip);
    if (!allowed.ok) return NextResponse.json({ error: "locked" }, { status: 429 });

    if (!(await passcodeMatches(passcode))) {
      await recordFailure(counter, ip);
      await new Promise((r) => setTimeout(r, 400)); // makes each wrong guess slower
      return NextResponse.json({ error: "wrong" }, { status: 401 });
    }
    await recordSuccess(counter, ip);
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 }); // the counter store is down: refuse rather than skip the limit
  }

  const res = NextResponse.json({ ok: true, next: safeNext(typeof body?.next === "string" ? body.next : null) });
  res.cookies.set(COOKIE, await makeSession(), { httpOnly: true, secure: isHttps(req), sameSite: "lax", path: "/", maxAge: SESSION_MS / 1000 });
  return res;
}

import { NextResponse } from "next/server";
import { COOKIE, isHttps } from "@/lib/auth";
import { sameOriginOnly } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bad = sameOriginOnly(req);
  if (bad) return bad;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: isHttps(req), sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

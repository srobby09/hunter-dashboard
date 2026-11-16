import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authUrl, googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/settings?error=not_configured`);
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(origin, state));
  res.cookies.set("g_state", state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}

import { NextResponse } from "next/server";
import { connectWithCode } from "@/lib/google";
import { storeConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const back = (q: string) => {
    const res = NextResponse.redirect(`${origin}/settings?${q}`);
    res.cookies.delete("g_state");
    return res;
  };
  const err = url.searchParams.get("error");
  if (err) return back(`error=${encodeURIComponent(err)}`);

  const state = url.searchParams.get("state");
  const cookie = req.headers.get("cookie")?.match(/(?:^|; )g_state=([^;]+)/)?.[1];
  if (!state || !cookie || state !== cookie) return back("error=bad_state");
  if (!storeConfigured()) return back("error=no_store");

  const code = url.searchParams.get("code");
  if (!code) return back("error=no_code");
  try {
    await connectWithCode(origin, code);
    return back("connected=1");
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : "failed")}`);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, checkSession, COOKIE, isHttps, makeSession, SESSION_MS } from "@/lib/auth";

// Runs before every page and every data request. Nothing is shown or changed without the family passcode.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  const ownAddress = /(^|\.)vercel\.app(:\d+)?$/.test(host) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);

  if (!authConfigured()) {
    // On a custom domain Vercel's own login doesn't apply, so never serve it without the passcode set up.
    if (!ownAddress) return new NextResponse("This site isn't set up yet.", { status: 503 });
    return NextResponse.next(); // the vercel.app address is still behind Vercel's login
  }

  const session = await checkSession(req.cookies.get(COOKIE)?.value);

  if (pathname === "/login" || pathname === "/api/login") {
    if (pathname === "/login" && session.ok) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!session.ok) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (session.refresh) {
    res.cookies.set(COOKIE, await makeSession(), { httpOnly: true, secure: isHttps(req), sameSite: "lax", path: "/", maxAge: SESSION_MS / 1000 });
  }
  return res;
}

export const config = {
  // Everything except the files the login page and the installed app need before anyone has signed in
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-touch-icon.png|manifest.webmanifest|sw.js|robots.txt).*)"],
};

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/apps", "/profile", "/billing", "/admin"];

/** Cheap edge check: no session cookie → login. Real validation happens server-side. */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.get("fj_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/apps/:path*", "/profile/:path*", "/billing/:path*", "/admin/:path*"] };

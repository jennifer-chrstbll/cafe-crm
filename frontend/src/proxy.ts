import { NextRequest, NextResponse } from "next/server";

/**
 * Optimistic redirect only: pages without a session cookie go to /login before any
 * JavaScript loads (no flash of an empty dashboard). Real authorization happens in
 * every API route via requireUser().
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.get("cafe_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // PWA files (service worker, manifest, offline page, icons) must load without a session.
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|icons/|.*\\.(?:png|svg|ico|jpg|webp)$).*)"],
};

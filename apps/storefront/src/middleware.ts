import { NextResponse, type NextRequest } from "next/server";

/**
 * Production HTTPS enforcement. Local `next dev` stays on http://localhost.
 * Behind nginx/a load balancer we trust `x-forwarded-proto`.
 */
export function middleware(request: NextRequest) {
  const production = process.env.NODE_ENV === "production";
  const forceHttps = production || process.env.FORCE_HTTPS === "true";
  if (!forceHttps) return NextResponse.next();

  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded ?? request.nextUrl.protocol.replace(":", "");
  if (proto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

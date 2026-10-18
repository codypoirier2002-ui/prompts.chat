import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isLoginRequired } from "@/lib/auth/access";

// Reachable without a session when PCHAT_REQUIRE_LOGIN is on.
// /api/mcp and /api/cron enforce their own API key / secret.
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health", "/api/cron", "/api/mcp", "/_next"];

const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  // Auth.js uses the __Secure- cookie name when served over HTTPS
  const secureCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(SECURE_SESSION_COOKIE));
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie,
  });
  return !!token;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    isLoginRequired() &&
    !PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) &&
    !(await hasValidSession(request))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // Rewrite .prompt.md and .prompt.yml requests to the raw API route
  if (pathname.startsWith("/prompts/") && (pathname.endsWith(".prompt.md") || pathname.endsWith(".prompt.yml"))) {
    const id = pathname.slice("/prompts/".length);
    const url = request.nextUrl.clone();
    url.pathname = `/api/prompts/${id}/raw`;
    return NextResponse.rewrite(url);
  }

  // Add pathname header for layout detection
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

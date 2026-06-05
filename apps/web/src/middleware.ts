import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
];

const authApiRoutes = ["/api/auth", "/api/health"];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.amazonaws.com http://localhost:9000",
    "connect-src 'self' https://*.amazonaws.com https://api.strava.com https://connect.garmin.com https://*.ingest.sentry.io wss: http://localhost:9000",
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default auth((req) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const onboardingComplete =
    (req.auth?.user as Record<string, unknown>)?.onboardingComplete ?? true;

  const nextWithNonce = () => {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("content-security-policy", csp);
    return res;
  };

  // Allow auth API routes and tRPC
  if (
    authApiRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/api/trpc")
  ) {
    return NextResponse.next();
  }

  // Allow public routes for unauthenticated users
  if (!isLoggedIn) {
    if (publicRoutes.includes(pathname) || pathname.startsWith("/share")) {
      return nextWithNonce();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated but onboarding not complete
  if (!onboardingComplete) {
    if (pathname === "/onboarding") {
      return nextWithNonce();
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Authenticated and onboarding complete — redirect away from auth pages
  if (publicRoutes.includes(pathname) && pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return nextWithNonce();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};

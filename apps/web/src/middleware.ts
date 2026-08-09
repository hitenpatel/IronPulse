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

function buildCsp(): string {
  const isDev = process.env.NODE_ENV !== "production";
  // Nonce + strict-dynamic is incompatible with statically prerendered pages
  // (/login, /signup, ...): their HTML is built once and cannot carry a
  // per-request nonce, so the browser blocks every script and the app never
  // hydrates. Stick to unsafe-inline until pages are made dynamic or a
  // hash-based policy is generated at build time.
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
    : `script-src 'self' 'unsafe-inline'`;
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
  const csp = buildCsp();

  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const onboardingComplete =
    (req.auth?.user as Record<string, unknown>)?.onboardingComplete ?? true;

  const nextWithCsp = () => {
    const res = NextResponse.next();
    res.headers.set("content-security-policy", csp);
    return res;
  };

  // API routes enforce their own auth (session, webhook signatures,
  // CRON_SECRET). Redirecting them to /login breaks external callers
  // like Stripe webhooks and cron.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public routes for unauthenticated users
  if (!isLoggedIn) {
    if (publicRoutes.includes(pathname) || pathname.startsWith("/share")) {
      return nextWithCsp();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated but onboarding not complete
  if (!onboardingComplete) {
    if (pathname === "/onboarding") {
      return nextWithCsp();
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Authenticated and onboarding complete — redirect away from auth pages
  if (publicRoutes.includes(pathname) && pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return nextWithCsp();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

const authApiRoutes = ["/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const onboardingComplete = (req.auth?.user as Record<string, unknown>)?.onboardingComplete ?? true;

  // Allow auth API routes and tRPC
  if (
    authApiRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/api/trpc")
  ) {
    return NextResponse.next();
  }

  // Allow public routes for unauthenticated users
  if (!isLoggedIn) {
    if (publicRoutes.some((route) => pathname === route)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated but onboarding not complete
  if (!onboardingComplete) {
    if (pathname === "/onboarding") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Authenticated and onboarding complete — redirect away from auth pages
  if (publicRoutes.includes(pathname) && pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};

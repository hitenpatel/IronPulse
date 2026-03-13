import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { db } from "@ironpulse/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid-link", req.url));
  }

  const magicToken = await db.magicLinkToken.findUnique({
    where: { token },
  });

  if (!magicToken || magicToken.used || magicToken.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired-link", req.url));
  }

  // Mark token as used
  await db.magicLinkToken.update({
    where: { id: magicToken.id },
    data: { used: true },
  });

  // Find or create user
  let user = await db.user.findUnique({
    where: { email: magicToken.email },
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      subscriptionStatus: true,
      unitSystem: true,
      onboardingComplete: true,
    },
  });

  if (!user) {
    // Create new user from magic link
    const emailPrefix = magicToken.email.split("@")[0] ?? "User";
    user = await db.user.create({
      data: {
        email: magicToken.email,
        name: emailPrefix,
        accounts: {
          create: {
            provider: "email",
            providerAccountId: magicToken.email,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        unitSystem: true,
        onboardingComplete: true,
      },
    });
  } else {
    // Ensure account record exists for email provider
    const existingAccount = await db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "email",
          providerAccountId: magicToken.email,
        },
      },
    });

    if (!existingAccount) {
      await db.account.create({
        data: {
          userId: user.id,
          provider: "email",
          providerAccountId: magicToken.email,
        },
      });
    }
  }

  // Create JWT manually
  const secret = process.env.NEXTAUTH_SECRET!;
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const jwt = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      subscriptionStatus: user.subscriptionStatus,
      unitSystem: user.unitSystem,
      onboardingComplete: user.onboardingComplete,
    },
    secret,
    salt: cookieName,
  });

  // Set session cookie
  const cookieStore = await cookies();

  cookieStore.set(cookieName, jwt, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Redirect based on onboarding status
  const redirectUrl = user.onboardingComplete ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(redirectUrl, req.url));
}

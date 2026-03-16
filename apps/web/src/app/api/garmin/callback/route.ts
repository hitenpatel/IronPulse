import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { getRedis } from "@ironpulse/api/src/lib/redis";
import { encryptToken } from "@ironpulse/api/src/lib/encryption";
import { runGarminBackfill } from "@ironpulse/api/src/lib/garmin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXTAUTH_URL!;

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`,
    );
  }

  // Verify CSRF state and retrieve PKCE verifier
  const redis = getRedis();
  const stored = await redis.get(`garmin:state:${state}`);
  await redis.del(`garmin:state:${state}`);

  if (!stored) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`,
    );
  }

  const { userId, codeVerifier } = JSON.parse(stored) as {
    userId: string;
    codeVerifier: string;
  };

  // Exchange code for tokens (with PKCE code_verifier)
  const tokenResponse = await fetch(
    "https://connectapi.garmin.com/oauth-service/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${baseUrl}/api/garmin/callback`,
        client_id: process.env.GARMIN_CLIENT_ID!,
        client_secret: process.env.GARMIN_CLIENT_SECRET!,
        code_verifier: codeVerifier,
      }),
    },
  );

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=token_exchange_failed`,
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: string;
  };

  // Upsert DeviceConnection with encrypted tokens
  const connection = await db.deviceConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: "garmin",
      },
    },
    create: {
      userId,
      provider: "garmin",
      providerAccountId: tokens.user_id,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
    update: {
      providerAccountId: tokens.user_id,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
  });

  // Fire-and-forget backfill
  runGarminBackfill(connection.id, db).catch((err) => {
    console.error("Garmin backfill failed:", err);
  });

  return NextResponse.redirect(
    `${baseUrl}/settings/integrations?connected=garmin`,
  );
}

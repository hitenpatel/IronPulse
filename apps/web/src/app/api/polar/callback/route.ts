import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { getRedis } from "@ironpulse/api/src/lib/redis";
import { encryptToken } from "@ironpulse/api/src/lib/encryption";
import { runPolarBackfill } from "@ironpulse/api/src/lib/polar";

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

  // Verify CSRF state
  const redis = getRedis();
  const userId = await redis.get(`polar:state:${state}`);
  await redis.del(`polar:state:${state}`);

  if (!userId) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`,
    );
  }

  // Exchange code for tokens (Polar uses Basic auth header)
  const credentials = `${process.env.POLAR_CLIENT_ID}:${process.env.POLAR_CLIENT_SECRET}`;
  const tokenResponse = await fetch(
    "https://polarremote.com/v2/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
      }).toString(),
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
    x_user_id: string;
  };

  // Upsert DeviceConnection with encrypted tokens
  const connection = await db.deviceConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: "polar",
      },
    },
    create: {
      userId,
      provider: "polar",
      providerAccountId: String(tokens.x_user_id),
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
    update: {
      providerAccountId: String(tokens.x_user_id),
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
  });

  // Fire-and-forget backfill
  runPolarBackfill(connection.id, db).catch((err) => {
    console.error("Polar backfill failed:", err);
  });

  return NextResponse.redirect(
    `${baseUrl}/settings/integrations?connected=polar`,
  );
}

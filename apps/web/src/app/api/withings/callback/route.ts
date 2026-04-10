import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { getRedis } from "@ironpulse/api/src/lib/redis";
import { encryptToken } from "@ironpulse/api/src/lib/encryption";
import { runWithingsBackfill } from "@ironpulse/api/src/lib/withings";

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
  const userId = await redis.get(`withings:state:${state}`);
  await redis.del(`withings:state:${state}`);

  if (!userId) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`,
    );
  }

  // Exchange code for tokens (Withings requires form-urlencoded with action param)
  const tokenBody = new URLSearchParams({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: process.env.WITHINGS_CLIENT_ID!,
    client_secret: process.env.WITHINGS_CLIENT_SECRET!,
    code,
    redirect_uri: `${baseUrl}/api/withings/callback`,
  });

  const tokenResponse = await fetch(
    "https://wbsapi.withings.net/v2/oauth2",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    },
  );

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=token_exchange_failed`,
    );
  }

  const json = (await tokenResponse.json()) as {
    status: number;
    body: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      userid: number;
    };
  };

  if (json.status !== 0) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=token_exchange_failed`,
    );
  }

  const tokens = json.body;

  // Upsert DeviceConnection with encrypted tokens
  const connection = await db.deviceConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: "withings",
      },
    },
    create: {
      userId,
      provider: "withings",
      providerAccountId: String(tokens.userid),
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
    update: {
      providerAccountId: String(tokens.userid),
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
  });

  // Fire-and-forget backfill
  runWithingsBackfill(connection.id, db).catch((err) => {
    console.error("Withings backfill failed:", err);
  });

  return NextResponse.redirect(
    `${baseUrl}/settings/integrations?connected=withings`,
  );
}

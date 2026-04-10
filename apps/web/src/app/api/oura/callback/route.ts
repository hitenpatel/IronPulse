import { NextRequest, NextResponse } from "next/server";
import { db } from "@ironpulse/db";
import { getRedis } from "@ironpulse/api/src/lib/redis";
import { encryptToken } from "@ironpulse/api/src/lib/encryption";
import { runOuraBackfill } from "@ironpulse/api/src/lib/oura";

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
  const userId = await redis.get(`oura:state:${state}`);
  await redis.del(`oura:state:${state}`);

  if (!userId) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`,
    );
  }

  // Exchange code for tokens
  const tokenResponse = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.OURA_CLIENT_ID,
      client_secret: process.env.OURA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl}/api/oura/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=token_exchange_failed`,
    );
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Upsert DeviceConnection with encrypted tokens
  const connection = await db.deviceConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: "oura",
      },
    },
    create: {
      userId,
      provider: "oura",
      providerAccountId: userId,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
    update: {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncEnabled: true,
    },
  });

  // Fire-and-forget backfill
  runOuraBackfill(connection.id, db).catch((err) => {
    console.error("Oura backfill failed:", err);
  });

  return NextResponse.redirect(
    `${baseUrl}/settings/integrations?connected=oura`,
  );
}

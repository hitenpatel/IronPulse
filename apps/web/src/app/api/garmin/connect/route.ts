import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { getRedis } from "@ironpulse/api/src/lib/redis";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));
  }

  // PKCE: generate code verifier and challenge
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const state = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  await redis.set(
    `garmin:state:${state}`,
    JSON.stringify({ userId: session.user.id, codeVerifier }),
    "EX",
    600,
  );

  const params = new URLSearchParams({
    client_id: process.env.GARMIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/garmin/callback`,
    response_type: "code",
    scope: "activity:read",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return NextResponse.redirect(
    `https://connectapi.garmin.com/oauth-service/oauth/authorize?${params.toString()}`,
  );
}

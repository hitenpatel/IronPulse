import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { getRedis } from "@ironpulse/api/src/lib/redis";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));
  }

  const state = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  await redis.set(`strava:state:${state}`, session.user.id, "EX", 600);

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/strava/callback`,
    response_type: "code",
    scope: "activity:read_all",
    state,
  });

  return NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params.toString()}`,
  );
}

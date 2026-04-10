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
  await redis.set(`withings:state:${state}`, session.user.id, "EX", 600);

  const params = new URLSearchParams({
    client_id: process.env.WITHINGS_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/withings/callback`,
    response_type: "code",
    scope: "user.metrics,user.activity",
    state,
  });

  return NextResponse.redirect(
    `https://account.withings.com/oauth2_user/authorize2?${params.toString()}`,
  );
}

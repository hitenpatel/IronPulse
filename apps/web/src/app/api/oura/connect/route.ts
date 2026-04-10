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
  await redis.set(`oura:state:${state}`, session.user.id, "EX", 600);

  const params = new URLSearchParams({
    client_id: process.env.OURA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/oura/callback`,
    response_type: "code",
    scope: "daily personal",
    state,
  });

  return NextResponse.redirect(
    `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`,
  );
}

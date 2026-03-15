import jwt from "jsonwebtoken";
import type { SessionUser } from "@ironpulse/shared";

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function signMobileToken(user: SessionUser): string {
  return jwt.sign({ sub: user.id, user }, getSecret(), { expiresIn: "30d" });
}

export function verifyMobileToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, getSecret()) as { user: SessionUser };
    return payload.user;
  } catch {
    return null;
  }
}

import { getPowerSyncJWKS } from "@ironpulse/api";

export async function GET() {
  const jwks = getPowerSyncJWKS();
  return Response.json(jwks, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

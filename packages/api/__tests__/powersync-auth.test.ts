import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import {
  signPowerSyncToken,
  getPowerSyncJWKS,
  generateKeyPairIfNeeded,
} from "../src/lib/powersync-auth";

beforeAll(() => {
  generateKeyPairIfNeeded();
});

describe("signPowerSyncToken", () => {
  it("returns a valid JWT with correct claims", () => {
    const token = signPowerSyncToken("user-123");
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded).not.toBeNull();
    expect(decoded!.payload).toMatchObject({
      sub: "user-123",
      aud: "powersync",
    });
    expect(decoded!.header.alg).toBe("RS256");
    expect(decoded!.header.kid).toBeDefined();
  });

  it("token expires in 5 minutes", () => {
    const token = signPowerSyncToken("user-123");
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const now = Math.floor(Date.now() / 1000);

    expect(decoded.exp).toBeDefined();
    expect(decoded.exp! - now).toBeGreaterThanOrEqual(295);
    expect(decoded.exp! - now).toBeLessThanOrEqual(305);
  });
});

describe("getPowerSyncJWKS", () => {
  it("returns a valid JWKS with one RSA key", () => {
    const jwks = getPowerSyncJWKS();

    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kty).toBe("RSA");
    expect(jwks.keys[0].alg).toBe("RS256");
    expect(jwks.keys[0].use).toBe("sig");
    expect(jwks.keys[0].kid).toBeDefined();
    expect(jwks.keys[0].n).toBeDefined();
    expect(jwks.keys[0].e).toBeDefined();
  });
});
